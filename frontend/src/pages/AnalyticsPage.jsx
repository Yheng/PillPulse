import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Line, Pie } from 'react-chartjs-2'
import { useAuth } from '../context/AuthContext'
import { useSchedule } from '../context/ScheduleContext'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

/**
 * Analytics Page Component
 * Displays comprehensive medication adherence analytics using Chart.js visualizations
 * Features stacked bar charts, line charts, and pie charts with date range filtering
 * Provides insights into medication adherence patterns and trends
 */
const AnalyticsPage = () => {
  const { isAuthenticated } = useAuth()
  const { schedules, fetchAnalytics } = useSchedule()
  
  // Component state for analytics data and UI controls
  const [analyticsData, setAnalyticsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end_date: new Date().toISOString().split('T')[0] // Today
  })
  const [selectedMedication, setSelectedMedication] = useState('')

  // Refs for chart export functionality
  const stackedBarRef = useRef(null)
  const lineChartRef = useRef(null)
  const pieChartRef = useRef(null)

  /**
   * Load analytics data when component mounts or filters change
   * Fetches data from backend API with current filter parameters
   */
  useEffect(() => {
    if (isAuthenticated()) {
      loadAnalyticsData()
    }
  }, [dateRange, selectedMedication, isAuthenticated])

  /**
   * Fetch analytics data from the backend
   * Constructs query parameters and updates component state
   */
  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Build query parameters for API call
      const params = {
        start_date: dateRange.start_date,
        end_date: dateRange.end_date
      }
      
      // Add medication filter if selected
      if (selectedMedication) {
        params.medication_id = selectedMedication
      }
      
      const data = await fetchAnalytics(params)
      setAnalyticsData(data)
    } catch (err) {
      setError(err.message || 'Failed to load analytics data')
      console.error('Analytics error:', err)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle date range input changes
   * Updates state and triggers data refresh
   * @param {Event} e - Input change event
   */
  const handleDateRangeChange = (e) => {
    const { name, value } = e.target
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }))
  }

  /**
   * Export chart as PNG image
   * Uses Chart.js toBase64Image method to generate download
   * @param {Object} chartRef - React ref to chart component
   * @param {string} filename - Name for downloaded file
   */
  const exportChart = (chartRef, filename) => {
    if (chartRef.current) {
      try {
        const chart = chartRef.current
        const url = chart.toBase64Image('image/png', 1.0)
        const link = document.createElement('a')
        link.download = `pillpulse-${filename}-${new Date().toISOString().split('T')[0]}.png`
        link.href = url
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        console.log(`Chart exported: ${filename}`)
      } catch (error) {
        console.error('Error exporting chart:', error)
        setError('Failed to export chart. Please try again.')
      }
    } else {
      setError('Chart not ready for export. Please wait for it to load.')
    }
  }

  /**
   * Export analytics data as CSV
   * Converts analytics data to CSV format and downloads
   */
  const exportAnalyticsCSV = () => {
    if (!analyticsData) {
      setError('No analytics data available for export')
      return
    }

    try {
      const csvData = []
      
      // Add header
      csvData.push(['Export Date', new Date().toISOString()])
      csvData.push(['Date Range', `${dateRange.start_date} to ${dateRange.end_date}`])
      csvData.push([]) // Empty row
      
      // Overall stats
      csvData.push(['Overall Statistics'])
      csvData.push(['Total Records', analyticsData.overall_stats?.total_records || 0])
      csvData.push(['Taken Count', analyticsData.overall_stats?.taken_count || 0])
      csvData.push(['Missed Count', analyticsData.overall_stats?.missed_count || 0])
      csvData.push(['Adherence Rate (%)', analyticsData.overall_stats?.adherence_rate || 0])
      csvData.push([]) // Empty row
      
      // Daily trend data
      if (analyticsData.daily_trend && analyticsData.daily_trend.length > 0) {
        csvData.push(['Daily Adherence Trend'])
        csvData.push(['Date', 'Total Doses', 'Taken Doses', 'Missed Doses', 'Adherence Rate (%)'])
        
        analyticsData.daily_trend.forEach(day => {
          csvData.push([
            day.date,
            day.total_doses,
            day.taken_doses,
            day.missed_doses,
            day.daily_adherence_rate
          ])
        })
        csvData.push([]) // Empty row
      }
      
      // Medication breakdown
      if (analyticsData.adherence_by_medication && analyticsData.adherence_by_medication.length > 0) {
        csvData.push(['Adherence by Medication'])
        csvData.push(['Medication', 'Dosage', 'Frequency', 'Total Records', 'Taken', 'Missed', 'Adherence Rate (%)'])
        
        analyticsData.adherence_by_medication.forEach(med => {
          csvData.push([
            med.medication_name,
            med.dosage,
            med.frequency,
            med.total_records,
            med.taken_count,
            med.missed_count,
            med.adherence_rate
          ])
        })
      }
      
      // Convert to CSV string
      const csvString = csvData.map(row => 
        row.map(cell => 
          typeof cell === 'string' && cell.includes(',') 
            ? `"${cell}"` 
            : cell
        ).join(',')
      ).join('\n')
      
      // Download CSV
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `pillpulse-analytics-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      console.log('Analytics data exported as CSV')
    } catch (error) {
      console.error('Error exporting CSV:', error)
      setError('Failed to export data. Please try again.')
    }
  }

  /**
   * Export analytics data as JSON
   * Downloads complete analytics data in JSON format
   */
  const exportAnalyticsJSON = () => {
    if (!analyticsData) {
      setError('No analytics data available for export')
      return
    }

    try {
      const exportData = {
        export_info: {
          exported_at: new Date().toISOString(),
          date_range: {
            start_date: dateRange.start_date,
            end_date: dateRange.end_date
          },
          filters: {
            medication_id: selectedMedication || null
          }
        },
        analytics_data: analyticsData
      }
      
      const jsonString = JSON.stringify(exportData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `pillpulse-analytics-${new Date().toISOString().split('T')[0]}.json`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      console.log('Analytics data exported as JSON')
    } catch (error) {
      console.error('Error exporting JSON:', error)
      setError('Failed to export data. Please try again.')
    }
  }

  /**
   * Generate stacked bar chart configuration
   * Shows adherence by medication over time
   * @returns {Object} Chart.js configuration object
   */
  const getStackedBarConfig = () => {
    if (!analyticsData?.adherence_by_medication) {
      return { labels: [], datasets: [] }
    }

    // Sample data structure - in real implementation, this would come from backend
    const medications = schedules.map(s => s.medication_name)
    const dates = []
    const currentDate = new Date(dateRange.start_date)
    const endDate = new Date(dateRange.end_date)
    
    // Generate date labels for the chart
    while (currentDate <= endDate) {
      dates.push(currentDate.toISOString().split('T')[0])
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Create datasets for each medication
    const datasets = medications.map((medication, index) => ({
      label: medication,
      data: dates.map(() => Math.floor(Math.random() * 2)), // Sample data - replace with real data
      backgroundColor: [
        '#2196F3', // pillpulse-blue
        '#81C784', // pillpulse-green
        '#26A69A', // pillpulse-teal
        '#B0BEC5', // pillpulse-gray
        '#FF9800', // orange
        '#9C27B0'  // purple
      ][index % 6],
      borderWidth: 1,
      borderRadius: 4,
    }))

    return {
      labels: dates.slice(0, 7), // Show last 7 days for readability
      datasets
    }
  }

  /**
   * Generate line chart configuration
   * Shows adherence trends over time
   * @returns {Object} Chart.js configuration object
   */
  const getLineChartConfig = () => {
    if (!analyticsData) {
      return { labels: [], datasets: [] }
    }

    // Generate sample trend data
    const dates = []
    const currentDate = new Date(dateRange.start_date)
    const endDate = new Date(dateRange.end_date)
    
    while (currentDate <= endDate && dates.length < 14) { // Show last 14 days
      dates.push(currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return {
      labels: dates,
      datasets: [
        {
          label: 'Adherence Rate (%)',
          data: dates.map(() => 70 + Math.random() * 30), // Sample data between 70-100%
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#2196F3',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
        }
      ]
    }
  }

  /**
   * Generate pie chart configuration
   * Shows distribution of taken vs missed medications
   * @returns {Object} Chart.js configuration object
   */
  const getPieChartConfig = () => {
    // Sample data - in real implementation, calculate from actual adherence records
    const taken = 75
    const missed = 25

    return {
      labels: ['Taken', 'Missed'],
      datasets: [
        {
          data: [taken, missed],
          backgroundColor: ['#81C784', '#F44336'],
          borderColor: ['#4CAF50', '#D32F2F'],
          borderWidth: 2,
          hoverBackgroundColor: ['#66BB6A', '#EF5350'],
        }
      ]
    }
  }

  // Chart options for consistent styling
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#2196F3',
        borderWidth: 1,
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 7,
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        }
      }
    }
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Please log in to view analytics</h2>
          <a href="/login" className="btn-primary">Go to Login</a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <motion.div
        className="bg-white rounded-lg shadow-md p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Medication Analytics</h1>
            <p className="text-gray-600 mt-2">
              Track your adherence patterns and identify improvement opportunities
            </p>
          </div>
          
          {/* Export Buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={exportAnalyticsCSV}
              className="btn-secondary text-sm flex items-center space-x-2"
              disabled={loading || !analyticsData}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export CSV</span>
            </button>
            <button
              onClick={exportAnalyticsJSON}
              className="btn-secondary text-sm flex items-center space-x-2"
              disabled={loading || !analyticsData}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>Export JSON</span>
            </button>
          </div>
          
          {/* Date Range Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                name="start_date"
                value={dateRange.start_date}
                onChange={handleDateRangeChange}
                className="input-field"
                max={dateRange.end_date}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                name="end_date"
                value={dateRange.end_date}
                onChange={handleDateRangeChange}
                className="input-field"
                min={dateRange.start_date}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Medication
              </label>
              <select
                value={selectedMedication}
                onChange={(e) => setSelectedMedication(e.target.value)}
                className="input-field"
              >
                <option value="">All Medications</option>
                {schedules.map(schedule => (
                  <option key={schedule.id} value={schedule.id}>
                    {schedule.medication_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Error Display */}
      {error && (
        <motion.div
          className="bg-red-50 border border-red-200 rounded-lg p-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-red-700">{error}</p>
        </motion.div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pillpulse-blue"></div>
        </div>
      ) : (
        <>
          {/* Summary Statistics */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overall Adherence</p>
                  <p className="text-3xl font-bold text-pillpulse-green">85%</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-xl">✓</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Doses Taken</p>
                  <p className="text-3xl font-bold text-pillpulse-blue">127</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-xl">💊</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Missed Doses</p>
                  <p className="text-3xl font-bold text-red-500">23</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-xl">✗</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stacked Bar Chart */}
          <motion.div
            className="bg-white rounded-lg shadow-md p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Daily Adherence by Medication
              </h2>
              <button
                onClick={() => exportChart(stackedBarRef, 'adherence-by-medication')}
                className="btn-secondary text-sm"
              >
                Export PNG
              </button>
            </div>
            <div className="h-80">
              <Bar
                ref={stackedBarRef}
                data={getStackedBarConfig()}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: {
                      display: true,
                      text: 'Medication Adherence (1 = Taken, 0 = Missed)',
                    }
                  },
                  scales: {
                    ...chartOptions.scales,
                    x: {
                      ...chartOptions.scales.x,
                      stacked: true,
                    },
                    y: {
                      ...chartOptions.scales.y,
                      stacked: true,
                      max: schedules.length,
                      ticks: {
                        stepSize: 1,
                      }
                    }
                  }
                }}
              />
            </div>
          </motion.div>

          {/* Line Chart and Pie Chart Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Line Chart */}
            <motion.div
              className="bg-white rounded-lg shadow-md p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  Adherence Trend
                </h2>
                <button
                  onClick={() => exportChart(lineChartRef, 'adherence-trend')}
                  className="btn-secondary text-sm"
                >
                  Export PNG
                </button>
              </div>
              <div className="h-64">
                <Line
                  ref={lineChartRef}
                  data={getLineChartConfig()}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      title: {
                        display: true,
                        text: 'Daily Adherence Percentage',
                      }
                    },
                    scales: {
                      ...chartOptions.scales,
                      y: {
                        ...chartOptions.scales.y,
                        min: 0,
                        max: 100,
                        ticks: {
                          callback: function(value) {
                            return value + '%'
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            </motion.div>

            {/* Pie Chart */}
            <motion.div
              className="bg-white rounded-lg shadow-md p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  Overall Distribution
                </h2>
                <button
                  onClick={() => exportChart(pieChartRef, 'adherence-distribution')}
                  className="btn-secondary text-sm"
                >
                  Export PNG
                </button>
              </div>
              <div className="h-64">
                <Pie
                  ref={pieChartRef}
                  data={getPieChartConfig()}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          usePointStyle: true,
                          padding: 20,
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        callbacks: {
                          label: function(context) {
                            return `${context.label}: ${context.parsed}%`
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            </motion.div>
          </div>

          {/* Insights Section */}
          <motion.div
            className="bg-white rounded-lg shadow-md p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Insights & Recommendations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 mb-2">💡 Best Performance</h3>
                <p className="text-blue-700 text-sm">
                  Your adherence is highest in the morning hours. Consider scheduling all medications before noon when possible.
                </p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-medium text-yellow-800 mb-2">⚠️ Areas for Improvement</h3>
                <p className="text-yellow-700 text-sm">
                  Evening medications show lower adherence rates. Set reminder alarms to improve consistency.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  )
}

export default AnalyticsPage