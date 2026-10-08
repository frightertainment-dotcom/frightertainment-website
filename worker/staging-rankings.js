// Staging-only, zero-provider daily ranking snapshot.
// Runs after verified critic reviews are editorially approved in the staging D1.
// Does NOT acquire reviews, scrape critics, or call licensed providers.
const RANKING_SQL = `
INSERT INTO rank_history(release_year,film_id,position,average_score,critic_count,ranked_at)
SELECT release_year,film_id,position,average_score,critic_count,ranked_at
FROM (
  SELECT f.release_year, f.film_id,
  ROW_NUMBER() OVER(PARTITION BY f.release_year ORDER BY ROUND(AVG(r.score*100.0/r.score_out_of),0) DESC,
    COUNT(DISTINCT r.critic_id) DESC,f.title COLLATE NOCASE,f.film_id) AS position,
  ROUND(AVG(r.score*100.0/r.score_out_of),0) AS average_score,
  COUNT(DISTINCT r.critic_id) AS critic_count,
  DATE('now') AS ranked_at
  FROM canonical_films f
  JOIN critic_reviews r ON r.film_id=f.film_id AND r.release_year=f.release_year
  WHERE f.editorial_status='approved' AND f.horror_verified=1
    AND r.status='approved' AND r.permission_cleared=1 AND r.professional_verified=1
    AND r.score>=0 AND r.score_out_of>0 AND r.score<=r.score_out_of
  GROUP BY f.release_year,f.film_id
  HAVING COUNT(DISTINCT r.critic_id)>=3
)
WHERE position<=20
ON CONFLICT(release_year,film_id,ranked_at)
DO UPDATE SET position=excluded.position,average_score=excluded.average_score,critic_count=excluded.critic_count
`;
export async function calculateDailyRanking(db, now=new Date()){
  if(!db)throw Error('Staging D1 binding missing');
  const result=await db.prepare(RANKING_SQL).run();
  const updatedAt=now.toISOString();
  return {updatedAt, rankedRows:result.meta?.changes??0,method:'approved-numeric-critic-scores-only'};
}
export default {
  async scheduled(_controller,env,_ctx){
    const startedAt=new Date().toISOString();
    try{
      const {rankedRows}=await calculateDailyRanking(env.DB);
      await env.DB.prepare(`INSERT INTO update_runs(run_id,task,country_code,trigger_name,status,started_at,finished_at,record_count)
        VALUES(?, 'daily-critic-ranking', '', 'cron-staging', 'published', ?, ?, ?)`)
        .bind(crypto.randomUUID(),startedAt,new Date().toISOString(),rankedRows).run();
      console.log(JSON.stringify({event:'daily_staging_rankings_updated',rankedRows}));
    }catch(error){
      console.error(JSON.stringify({event:'daily_staging_rankings_failed',reason:String(error?.message||'unknown').slice(0,180)}));
      throw error;
    }
  }
};
