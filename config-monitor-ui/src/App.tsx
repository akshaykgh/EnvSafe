import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

interface ConfigDrift {
  id: string
  applicationName: string
  configKey: string
  expectedValue: string | null
  actualValue: string | null
  driftType: 'MISSING' | 'OVERRIDE' | 'RULE_VIOLATION'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  firstDetectedAt: string
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED'
  acknowledgedAt: string | null
  resolvedAt: string | null
  description: string
}

interface ConfigComparison {
  applicationName: string
  environment: string
  baselineConfig: Record<string, any>
  runtimeConfig: Record<string, any>
  snapshotTimestamp: string | null
}

const API_BASE = '/api/v1'

function App() {
  const [drifts, setDrifts] = useState<ConfigDrift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterApplication, setFilterApplication] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('ACTIVE')
  const [configComparisons, setConfigComparisons] = useState<Record<string, ConfigComparison>>({})
  const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchDrifts()
    const interval = setInterval(fetchDrifts, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [filterApplication, filterStatus])

  const fetchDrifts = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (filterApplication) params.append('applicationName', filterApplication)
      if (filterStatus) params.append('status', filterStatus)
      
      const response = await axios.get<ConfigDrift[]>(`${API_BASE}/drifts?${params}`)
      setDrifts(response.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch drifts')
      console.error('Error fetching drifts:', err)
    } finally {
      setLoading(false)
    }
  }

  const acknowledgeDrift = async (id: string) => {
    try {
      await axios.post(`${API_BASE}/drifts/${id}/acknowledge`)
      fetchDrifts()
    } catch (err: any) {
      alert('Failed to acknowledge drift: ' + (err.response?.data?.error || err.message))
    }
  }

  const resolveDrift = async (id: string) => {
    try {
      await axios.post(`${API_BASE}/drifts/${id}/resolve`)
      fetchDrifts()
    } catch (err: any) {
      alert('Failed to resolve drift: ' + (err.response?.data?.error || err.message))
    }
  }

  const getSeverityClass = (severity: string) => {
    return severity.toLowerCase()
  }

  const getStatusBadgeClass = (status: string) => {
    return `status-${status.toLowerCase()}`
  }

  const fetchConfigComparison = async (applicationName: string) => {
    if (configComparisons[applicationName]) {
      // Toggle expansion
      const newExpanded = new Set(expandedApps)
      if (newExpanded.has(applicationName)) {
        newExpanded.delete(applicationName)
      } else {
        newExpanded.add(applicationName)
      }
      setExpandedApps(newExpanded)
      return
    }

    try {
      const response = await axios.get<ConfigComparison>(`${API_BASE}/drifts/config-comparison/${applicationName}`)
      setConfigComparisons(prev => ({ ...prev, [applicationName]: response.data }))
      setExpandedApps(prev => new Set(prev).add(applicationName))
    } catch (err: any) {
      console.error('Failed to fetch config comparison:', err)
      // Don't show alert, just log
    }
  }

  // Fetch config comparisons for all applications with drifts
  useEffect(() => {
    const appsWithDrifts = Array.from(new Set(drifts.map(d => d.applicationName)))
    appsWithDrifts.forEach(async (appName) => {
      if (!configComparisons[appName]) {
        try {
          const response = await axios.get<ConfigComparison>(`${API_BASE}/drifts/config-comparison/${appName}`)
          setConfigComparisons(prev => ({ ...prev, [appName]: response.data }))
        } catch (err: any) {
          console.error(`Failed to fetch config comparison for ${appName}:`, err)
        }
      }
    })
  }, [drifts.length]) // Fetch when drifts change

  const uniqueApplications = Array.from(new Set(drifts.map(d => d.applicationName)))

  return (
    <div className="container">
      <div className="header">
        <h1>Configuration Drift Monitor</h1>
        <p>Track and manage configuration differences between Git and runtime</p>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="filters">
        <div className="filter-group">
          <label>Application</label>
          <select
            value={filterApplication}
            onChange={(e) => setFilterApplication(e.target.value)}
          >
            <option value="">All Applications</option>
            {uniqueApplications.map(app => (
              <option key={app} value={app}>{app}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ACTIVE">Active</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved</option>
            <option value="">All</option>
          </select>
        </div>
      </div>

      {/* Show config comparisons for all applications */}
      {uniqueApplications.length > 0 && (
        <div className="config-comparisons-section">
          <h2 style={{ marginBottom: '20px', color: '#333' }}>Configuration Files</h2>
          {uniqueApplications.map(appName => {
            const comparison = configComparisons[appName]
            const isExpanded = expandedApps.has(appName)
            
            if (!comparison) {
              return (
                <div key={appName} className="config-comparison-placeholder">
                  <h3>{appName}</h3>
                  <p>Loading config files...</p>
                </div>
              )
            }

            return (
              <div key={appName} className="config-comparison">
                <div 
                  className="config-comparison-header"
                  onClick={() => fetchConfigComparison(appName)}
                  style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <h3>{appName} ({comparison.environment})</h3>
                  <span style={{ fontSize: '0.875rem', color: '#667eea' }}>
                    {isExpanded ? '▼ Hide' : '▶ Show'} Config Files
                  </span>
                </div>
                
                {isExpanded && (
                  <div className="config-files">
                    <div className="config-file">
                      <h4>Expected (Baseline from Git)</h4>
                      <pre className="config-content">
                        {Object.keys(comparison.baselineConfig).length > 0 
                          ? JSON.stringify(comparison.baselineConfig, null, 2)
                          : '(No baseline configured)'}
                      </pre>
                    </div>
                    <div className="config-file">
                      <h4>Current (Runtime)</h4>
                      <pre className="config-content">
                        {Object.keys(comparison.runtimeConfig).length > 0
                          ? JSON.stringify(comparison.runtimeConfig, null, 2)
                          : '(No runtime config)'}
                      </pre>
                      {comparison.snapshotTimestamp && (
                        <p className="config-timestamp">
                          Last updated: {new Date(comparison.snapshotTimestamp).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {loading ? (
        <div className="loading">Loading drifts...</div>
      ) : drifts.length === 0 ? (
        <div className="empty-state">
          <h2>No drifts found</h2>
          <p>All configurations are in sync with the baseline.</p>
        </div>
      ) : (
        <div className="drifts-list">
          {drifts.map(drift => (
            <div key={drift.id} className={`drift-card ${getSeverityClass(drift.severity)}`}>
              <div className="drift-header">
                <div className="drift-title">
                  <h3>
                    <span className="config-key">{drift.configKey}</span>
                  </h3>
                  <div style={{ marginTop: '8px' }}>
                    <span className={`drift-badge badge-${drift.severity.toLowerCase()}`}>
                      {drift.severity}
                    </span>
                    <span className={`status-badge ${getStatusBadgeClass(drift.status)}`} style={{ marginLeft: '8px' }}>
                      {drift.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="drift-details">
                <div className="detail-item">
                  <span className="detail-label">Application</span>
                  <span className="detail-value">{drift.applicationName}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Type</span>
                  <span className="detail-value">{drift.driftType}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Expected</span>
                  <span className="detail-value">
                    {drift.expectedValue ? <code>{drift.expectedValue}</code> : <em>null</em>}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Actual</span>
                  <span className="detail-value">
                    {drift.actualValue ? <code>{drift.actualValue}</code> : <em>null</em>}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Detected</span>
                  <span className="detail-value">
                    {new Date(drift.firstDetectedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {drift.description && (
                <div className="drift-description">
                  {drift.description}
                </div>
              )}

              {drift.status === 'ACTIVE' && (
                <div className="drift-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => acknowledgeDrift(drift.id)}
                  >
                    Acknowledge
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={() => resolveDrift(drift.id)}
                  >
                    Resolve
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default App
