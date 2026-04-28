import { ArrowDown, Download, Eye, Edit, Trash2, Plus, Upload, Search } from 'lucide-react';
import React, { useEffect, useState } from 'react'

const JobTrackerOverview = () => {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [tagFilterOpen, setTagFilterOpen] = useState(false);
  const [dateFilterOpen, setDateFilterOpen] = useState(false);

  useEffect(() => {
    // Fetch job leads from Django API
    fetch('https://your-django-api.com/api/job-leads/', {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    })
      .then(response => response.json())
      .then(data => setJobs(data))
      .catch(error => console.error('Error fetching jobs:', error));
  }, []);

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-black-light">Job Tracker</h2>
        <div className="flex items-center space-x-2">
          <button className="px-3 py-1.5 text-sm font-medium rounded-button border border-neutral-dark bg-white hover:bg-neutral text-secondary-dark flex items-center">
            <Plus className="w-4 h-4 mr-1.5" /> Add Job
          </button>
          <button className="px-3 py-1.5 text-sm font-medium rounded-button border border-neutral-dark bg-white hover:bg-neutral text-secondary-dark flex items-center">
            <Upload className="w-4 h-4 mr-1.5" /> Import CSV
          </button>
        </div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-sm border border-neutral-dark mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-grow max-w-xs">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-secondary-dark/60" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs..."
              className="w-full pl-10 pr-4 py-2 border-none bg-neutral rounded-lg text-sm focus:ring-2 focus:ring-primary-light focus:ring-opacity-20 focus:outline-none"
            />
          </div>
          <div className="relative">
            <button onClick={() => setStatusFilterOpen(!statusFilterOpen)} className="px-3 py-2 text-sm font-medium rounded-lg border border-neutral-dark bg-white hover:bg-neutral text-secondary-dark flex items-center">
              Status <ArrowDown className="w-4 h-4 ml-1.5" />
            </button>
            {statusFilterOpen && (
              <div className="absolute mt-1 w-40 bg-white shadow-sm rounded-lg border border-neutral-dark z-10">
                {['Sent', 'Opened', 'Replied', 'Follow-up Due'].map(status => (
                  <label key={status} className="flex items-center p-1.5 hover:bg-neutral rounded cursor-pointer">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">{status}</span>
                  </label>
                ))}
                <div className="border-t border-neutral-dark p-2 flex justify-end">
                  <button className="px-2 py-1 text-xs font-medium text-primary-light hover:bg-primary-light/5 rounded">Apply Filters</button>
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setTagFilterOpen(!tagFilterOpen)} className="px-3 py-2 text-sm font-medium rounded-lg border border-neutral-dark bg-white hover:bg-neutral text-secondary-dark flex items-center">
              Tags <ArrowDown className="w-4 h-4 ml-1.5" />
            </button>
            {tagFilterOpen && (
              <div className="absolute mt-1 w-40 bg-white shadow-sm rounded-lg border border-neutral-dark z-10">
                {['Remote', 'Senior', 'Urgent', 'Favorite'].map(tag => (
                  <label key={tag} className="flex items-center p-1.5 hover:bg-neutral rounded cursor-pointer">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">{tag}</span>
                  </label>
                ))}
                <div className="border-t border-neutral-dark p-2 flex justify-end">
                  <button className="px-2 py-1 text-xs font-medium text-primary-light hover:bg-primary-light/5 rounded">Apply Filters</button>
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setDateFilterOpen(!dateFilterOpen)} className="px-3 py-2 text-sm font-medium rounded-lg border border-neutral-dark bg-white hover:bg-neutral text-secondary-dark flex items-center">
              Date Range <ArrowDown className="w-4 h-4 ml-1.5" />
            </button>
            {dateFilterOpen && (
              <div className="absolute mt-1 w-64 bg-white shadow-sm rounded-lg border border-neutral-dark z-10">
                <div className="p-3">
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-secondary-dark mb-1">Start Date</label>
                    <input type="date" className="w-full px-3 py-1.5 border border-neutral-dark rounded-lg text-sm focus:ring-2 focus:ring-primary-light focus:ring-opacity-20 focus:outline-none" />
                  </div>
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-secondary-dark mb-1">End Date</label>
                    <input type="date" className="w-full px-3 py-1.5 border border-neutral-dark rounded-lg text-sm focus:ring-2 focus:ring-primary-light focus:ring-opacity-20 focus:outline-none" />
                  </div>
                </div>
                <div className="border-t border-neutral-dark p-2 flex justify-end">
                  <button className="px-2 py-1 text-xs font-medium text-primary-light hover:bg-primary-light/5 rounded mr-1">Reset</button>
                  <button className="px-2 py-1 text-xs font-medium bg-primary-light text-white rounded">Apply</button>
                </div>
              </div>
            )}
          </div>
          <button className="px-3 py-2 text-sm font-medium rounded-lg border border-neutral-dark bg-white hover:bg-neutral text-secondary-dark flex items-center ml-auto">
            <Download className="w-4 h-4 mr-1.5" /> Export
          </button>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-neutral-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-dark">
            <thead className="bg-neutral">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-dark uppercase tracking-wider">
                  <div className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    Job Title
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-dark uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-dark uppercase tracking-wider">Applied From</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-dark uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-dark uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-secondary-dark uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-dark">
              {jobs.map(job => (
                <tr key={job.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <input type="checkbox" className="mr-3" />
                      <div>
                        <div className="text-sm font-medium text-black">{job.title}</div>
                        <div className="flex items-center mt-1">
                          {job.tags.map(tag => (
                            <span key={tag} className={`px-2 py-0.5 text-xs rounded-full mr-1 ${tag === 'Remote' ? 'bg-blue-100 text-blue-800' : tag === 'Senior' ? 'bg-purple-100 text-purple-800' : tag === 'Urgent' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-black">{job.company}</div>
                    <div className="text-xs text-secondary-dark">{job.location}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-black">{job.applied_from}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${job.status === 'Replied' ? 'bg-green-100 text-green-800' : job.status === 'Opened' ? 'bg-yellow-100 text-yellow-800' : job.status === 'Follow-up Due' ? 'bg-blue-100 text-blue-800' : 'bg-neutral-dark text-secondary-dark'}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-dark">{job.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button className="p-1 rounded hover:bg-neutral-dark">
                        <Eye className="w-5 h-5 text-secondary-dark" />
                      </button>
                      <button className="p-1 rounded hover:bg-neutral-dark">
                        <Edit className="w-5 h-5 text-secondary-dark" />
                      </button>
                      <button className="p-1 rounded hover:bg-neutral-dark">
                        <Trash2 className="w-5 h-5 text-secondary-dark" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-neutral-dark sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <a href="#" className="relative inline-flex items-center px-4 py-2 border border-neutral-dark text-sm font-medium rounded-md text-secondary-dark bg-white hover:bg-neutral">Previous</a>
            <a href="#" className="ml-3 relative inline-flex items-center px-4 py-2 border border-neutral-dark text-sm font-medium rounded-md text-secondary-dark bg-white hover:bg-neutral">Next</a>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-secondary-dark">
                Showing <span className="font-medium">1</span> to <span className="font-medium">5</span> of <span className="font-medium">24</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <a href="#" className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-neutral-dark bg-white text-sm font-medium text-secondary-dark hover:bg-neutral">
                  <ArrowDown className="w-5 h-5 rotate-90" />
                </a>
                <a href="#" className="z-10 bg-primary-light border-primary-light text-white relative inline-flex items-center px-4 py-2 border text-sm font-medium">1</a>
                <a href="#" className="bg-white border-neutral-dark text-secondary-dark hover:bg-neutral relative inline-flex items-center px-4 py-2 border text-sm font-medium">2</a>
                <a href="#" className="bg-white border-neutral-dark text-secondary-dark hover:bg-neutral relative inline-flex items-center px-4 py-2 border text-sm font-medium">3</a>
                <span className="relative inline-flex items-center px-4 py-2 border border-neutral-dark bg-white text-sm font-medium text-secondary-dark">...</span>
                <a href="#" className="bg-white border-neutral-dark text-secondary-dark hover:bg-neutral relative inline-flex items-center px-4 py-2 border text-sm font-medium">5</a>
                <a href="#" className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-neutral-dark bg-white text-sm font-medium text-secondary-dark hover:bg-neutral">
                  <ArrowDown className="w-5 h-5 -rotate-90" />
                </a>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default JobTrackerOverview
