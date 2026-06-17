'use client';

import TeamScoreCard from './TeamScoreCard';
import CommitmentCard from './CommitmentCard';
import MyProgressCard from './MyProgressCard';
import ActivityFeed from './ActivityFeed';

export default function Home() {
  return (
    <div className="space-y-4 pb-8">
      <MyProgressCard />
      <CommitmentCard />
      <TeamScoreCard />
      <ActivityFeed />
    </div>
  );
}
