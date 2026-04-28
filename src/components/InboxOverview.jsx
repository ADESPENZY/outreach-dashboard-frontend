import React from 'react'
import { MoreHorizontal, RefreshCw } from 'lucide-react';

const InboxOverview = () => {
  const inboxes = [
    {
      email: 'alex.mitchell@gmail.com',
      status: 'Live',
      statusColor: 'bg-chart-5',
      quota: '13/30',
      quotaPercent: 43,
      lastSent: '32m ago',
      nextSend: '~15 minutes',
      opens: 42,
      openChange: '+12%',
      replies: 7,
      replyChange: '+5%',
    },
    {
      email: 'sarah.dev@gmail.com',
      status: 'Warming (Day 5/14)',
      statusColor: 'bg-chart-3',
      quota: '5/10',
      quotaPercent: 50,
      lastSent: '1h 15m ago',
      nextSend: '~45 minutes',
      opens: 18,
      openChange: '+8%',
      replies: 2,
      replyChange: '0%',
    },
    {
      email: 'michael.tech@gmail.com',
      status: 'Live',
      statusColor: 'bg-chart-5',
      quota: '21/25',
      quotaPercent: 84,
      lastSent: '5m ago',
      nextSend: '~20 minutes',
      opens: 53,
      openChange: '+15%',
      replies: 11,
      replyChange: '+10%',
    },
  ];

  return (
    <section className="mb-8 font-roboto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-black">Inbox Overview</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Last updated: 10 minutes ago</span>
          <button className="p-1.5 rounded-full hover:bg-neutral-dark">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {inboxes.map((inbox, index) => (
          <div key={index} className="bg-card rounded-lg shadow-sm border border-neutral-dark p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{inbox.email}</p>
                <div className="flex items-center mt-1">
                  <span className={`w-2 h-2 rounded-full ${inbox.statusColor} mr-1.5`}></span>
                  <span className="text-sm font-medium text-secondary-dark">{inbox.status}</span>
                </div>
              </div>
              <div className="relative">
                <button className="p-1 rounded hover:bg-neutral-dark">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Daily Quota</p>
                <p className="text-lg font-semibold text-black mt-1">{inbox.quota}</p>
                <div className="w-full h-1.5 bg-neutral-dark rounded-full mt-2">
                  <div className="h-1.5 bg-primary rounded-full" style={{ width: `${inbox.quotaPercent}%` }}></div>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Last Sent</p>
                <p className="text-lg font-semibold text-black mt-1">{inbox.lastSent}</p>
                <p className="text-xs text-muted-foreground mt-2">Next: {inbox.nextSend}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center">
                  <p className="text-xs font-medium text-muted-foreground">Opens</p>
                  <span className="ml-1 text-xs text-chart-5">{inbox.openChange}</span>
                </div>
                <p className="text-lg font-semibold text-black mt-1">{inbox.opens}</p>
              </div>
              <div>
                <div className="flex items-center">
                  <p className="text-xs font-medium text-muted-foreground">Replies</p>
                  <span className="ml-1 text-xs text-chart-5">{inbox.replyChange}</span>
                </div>
                <p className="text-lg font-semibold text-black mt-1">{inbox.replies}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default InboxOverview