import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'
import { TrendingUp, Award } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useMemo } from 'react'
import PerformanceChart from '../components/PerformanceChart'
import { usePullToRefresh } from "../hooks/usePullToRefresh"
import PullToRefreshIndicator from "../components/PullToRefreshIndicator"
import { useState } from 'react'

export default function PerformanceCharts() {
  const { players, fixtures, fitnessTests, userRole, currentPlayerId } = useApp()
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRefresh = async () => {
    setRefreshKey(prev => prev + 1)
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  const { isPulling, pullDistance } = usePullToRefresh(handleRefresh)

  // For players: show only their own data
  const currentPlayer = useMemo(() => {
    if (userRole === "player" && currentPlayerId) {
      return players.find(p => p.id === currentPlayerId)
    }
    return null
  }, [userRole, currentPlayerId, players])

  // Fitness progression data
  const fitnessData = useMemo(() => {
    if (userRole === "player" && currentPlayerId) {
      // Player view - their own fitness progression
      return fitnessTests
        .filter(t => t.playerId === currentPlayerId)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(test => ({
          date: new Date(test.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
          score: parseInt(test.sprint) + parseInt(test.agility) + parseInt(test.endurance) + parseInt(test.strength),
          sprint: parseInt(test.sprint),
          agility: parseInt(test.agility),
          endurance: parseInt(test.endurance),
          strength: parseInt(test.strength)
        }))
    } else {
      // Coach view - team average progression
      const testsByDate = fitnessTests.reduce((acc, test) => {
        const date = test.date
        if (!acc[date]) {
          acc[date] = []
        }
        acc[date].push({
          sprint: parseInt(test.sprint),
          agility: parseInt(test.agility),
          endurance: parseInt(test.endurance),
          strength: parseInt(test.strength)
        })
        return acc
      }, {})

      return Object.entries(testsByDate)
        .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
        .map(([date, tests]) => {
          const avgSprint = tests.reduce((sum, t) => sum + t.sprint, 0) / tests.length
          const avgAgility = tests.reduce((sum, t) => sum + t.agility, 0) / tests.length
          const avgEndurance = tests.reduce((sum, t) => sum + t.endurance, 0) / tests.length
          const avgStrength = tests.reduce((sum, t) => sum + t.strength, 0) / tests.length

          return {
            date: new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
            score: Math.round(avgSprint + avgAgility + avgEndurance + avgStrength),
            sprint: Math.round(avgSprint),
            agility: Math.round(avgAgility),
            endurance: Math.round(avgEndurance),
            strength: Math.round(avgStrength)
          }
        })
    }
  }, [fitnessTests, userRole, currentPlayerId])

  // Goals progression data
  const goalsData = useMemo(() => {
    if (userRole === "player" && currentPlayerId && currentPlayer) {
      // Player view - their goals over time
      const completedFixtures = fixtures
        .filter(f => f.status === "Completed")
        .sort((a, b) => new Date(a.date) - new Date(b.date))

      let cumulativeGoals = 0
      return completedFixtures.map(fixture => {
        const playerGoals = fixture.scorers?.filter(s => s === currentPlayer.firstName).length || 0
        cumulativeGoals += playerGoals
        return {
          date: new Date(fixture.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
          goals: cumulativeGoals,
          match: `vs ${fixture.opponent}`
        }
      })
    } else {
      // Coach view - team goals by match
      return fixtures
        .filter(f => f.status === "Completed")
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(fixture => ({
          date: new Date(fixture.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
          goals: fixture.scorers?.length || 0,
          opponent: fixture.opponent
        }))
    }
  }, [fixtures, userRole, currentPlayerId, currentPlayer])

  // Top scorers data
  const topScorersData = useMemo(() => {
    const scorerCounts = {}

    fixtures
      .filter(f => f.status === "Completed")
      .forEach(fixture => {
        fixture.scorers?.forEach(scorer => {
          scorerCounts[scorer] = (scorerCounts[scorer] || 0) + 1
        })
      })

    return Object.entries(scorerCounts)
      .map(([name, goals]) => ({ name, goals }))
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 10)
  }, [fixtures])

  const COLORS = ['#1E5EFF', '#6FA8FF', '#0B1F51', '#3B82F6', '#60A5FA', '#93C5FD', '#DBEAFE', '#1D4ED8', '#2563EB', '#3B82F6']

  return (
    <div className="flex-1 p-4 md:p-6 bg-gray-50 dark:bg-gray-950 min-h-screen overflow-y-auto">
      <PullToRefreshIndicator isPulling={isPulling} pullDistance={pullDistance} />
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
            {userRole === "player" ? "My Performance Charts" : "Performance Analytics"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {userRole === "player" ? "Track your progress over time" : "Track team and player performance over time"}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Fitness Progress Chart */}
          <PerformanceChart 
            data={fitnessData}
            title={userRole === "player" ? "My Fitness Progression" : "Team Average Fitness Progression"}
            dataKey="score"
            color="#8B5CF6"
          />

          {/* Goals Chart */}
          <PerformanceChart 
            data={goalsData}
            title={userRole === "player" ? "Cumulative Goals" : "Team Goals by Match"}
            dataKey="goals"
            color="#F59E0B"
          />
        </div>

        {/* Top Scorers - Coach only */}
        {userRole !== "player" && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 p-3 rounded-xl">
                <Award className="text-white" size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Top Scorers</h3>
            </div>

            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topScorersData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-800" />
                <XAxis 
                  dataKey="name" 
                  stroke="#9ca3af"
                  className="dark:stroke-gray-600"
                  style={{ fontSize: '12px' }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis 
                  stroke="#9ca3af"
                  className="dark:stroke-gray-600"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  className="dark:bg-gray-800 dark:border-gray-700"
                />
                <Bar dataKey="goals" radius={[8, 8, 0, 0]}>
                  {topScorersData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
