import React from 'react'
import SetupChecklist from './SetupChecklist';
import InboxOverview from './InboxOverview';
import JobTrackerOverview from './JobTrackerOverview';
import AnalyticsDashboardOverview from './AnalyticsDashboardOverview';

const DashboardPage = () => {
  return (
    <div>
      <SetupChecklist />
      <InboxOverview />
      <JobTrackerOverview />
      <AnalyticsDashboardOverview />
    </div>
  );
};

export default DashboardPage