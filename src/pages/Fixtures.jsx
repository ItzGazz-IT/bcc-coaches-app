import { useState, useEffect } from "react"
import { Calendar, Clock, MapPin, Trophy, Plus, Edit, Trash2, CheckCircle, Users, Search, Upload, FileText, ExternalLink, Loader2 } from "lucide-react"
import { useApp } from "../contexts/AppContext"
import { TableSkeleton } from "../components/Loading"
import { storage } from "../firebase/config"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { useSearchParams } from "react-router-dom"

const RESERVE_KICKOFF = "13:45"
const FIRST_TEAM_KICKOFF = "15:30"

const getTeamIdFromKickoffTime = (timeValue, fallbackTeam = "") => {
  if (timeValue === RESERVE_KICKOFF) return "reserve"
  if (timeValue === FIRST_TEAM_KICKOFF) return "first"

  const normalizedTeam = String(fallbackTeam || "").toLowerCase()
  if (normalizedTeam.includes("reserve")) return "reserve"
  if (normalizedTeam.includes("first")) return "first"

  return "other"
}

const getDefaultKickoffTime = (teamValue = "first") => {
  if (teamValue === "reserve") return RESERVE_KICKOFF
  return FIRST_TEAM_KICKOFF
}

const getTeamLabel = (teamOrFixture, fallbackTeam = "") => {
  const fixture = typeof teamOrFixture === "object" ? teamOrFixture : null
  const teamId = fixture
    ? getTeamIdFromKickoffTime(fixture.time, fixture.team)
    : getTeamIdFromKickoffTime("", teamOrFixture || fallbackTeam)

  if (teamId === "reserve") return "Reserve Team"
  if (teamId === "first") return "First Team"
  return "Team"
}

const getFixtureTime = (fixture) => fixture.time || getDefaultKickoffTime(fixture.team)

const getTodayKey = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const isNotPlayedResult = (fixture) => String(fixture?.result || "").toLowerCase().trim() === "not played"

const isValidDateKey = (dateValue) => /^\d{4}-\d{2}-\d{2}$/.test(String(dateValue || ""))

const isUpcomingByDate = (fixture) => {
  if (isNotPlayedResult(fixture)) {
    return true
  }

  if (!isValidDateKey(fixture?.date)) {
    return true
  }

  return fixture.date >= getTodayKey()
}

const isResultsByDate = (fixture) => {
  if (isNotPlayedResult(fixture)) {
    return false
  }

  if (!isValidDateKey(fixture?.date)) {
    return false
  }

  return fixture.date < getTodayKey()
}

const groupFixtures = (fixtures) => {
  const groups = new Map()

  fixtures.forEach((fixture) => {
    const teamId = getTeamIdFromKickoffTime(fixture.time, fixture.team)
    const key = [
      fixture.date,
      fixture.opponent,
      fixture.venue || "",
      fixture.homeAway || "",
      fixture.competition || "",
      teamId
    ].join("|")

    if (!groups.has(key)) {
      groups.set(key, {
        date: fixture.date,
        opponent: fixture.opponent,
        venue: fixture.venue,
        homeAway: fixture.homeAway,
        competition: fixture.competition,
        fixtures: []
      })
    }

    groups.get(key).fixtures.push(fixture)
  })

  return Array.from(groups.values()).sort((a, b) => {
    const aHasDate = isValidDateKey(a.date)
    const bHasDate = isValidDateKey(b.date)

    if (aHasDate && bHasDate) {
      return a.date.localeCompare(b.date)
    }

    if (aHasDate && !bHasDate) return 1
    if (!aHasDate && bHasDate) return -1

    return String(a.opponent || "").localeCompare(String(b.opponent || ""))
  })
}

const getTeamSortKey = (teamOrFixture, fallbackTeam = "") => {
  const fixture = typeof teamOrFixture === "object" ? teamOrFixture : null
  const teamId = fixture
    ? getTeamIdFromKickoffTime(fixture.time, fixture.team)
    : getTeamIdFromKickoffTime("", teamOrFixture || fallbackTeam)

  if (teamId === "reserve") return 1
  if (teamId === "first") return 2
  return 3
}

const sanitizeFileName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, "_")

const getFileExtension = (name) => {
  const parts = name.split(".")
  return parts.length > 1 ? parts.pop().toLowerCase() : ""
}

function Fixtures() {
  const { fixtures, addFixture, updateFixture, deleteFixture, loading, userRole, markAsSeen } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Mark fixtures as seen when component mounts
  useEffect(() => {
    markAsSeen("fixtures")
  }, [])
  
  const [showModal, setShowModal] = useState(false)
  const [editingFixture, setEditingFixture] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") === "results" ? "results" : "fixtures")
  const [teamView, setTeamView] = useState("all")
  const [formData, setFormData] = useState({
    date: "",
    time: getDefaultKickoffTime("first"),
    opponent: "",
    competition: "",
    venue: "",
    homeAway: "Home",
    team: "first",
    result: "",
    score: ""
  })
  const [showSuccess, setShowSuccess] = useState(false)
  const [uploadingReportFor, setUploadingReportFor] = useState(null)

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab")
    if (tabFromUrl === "results" || tabFromUrl === "fixtures") {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const normalizedResult = String(formData.result || "").trim()
    const notPlayed = normalizedResult === "Not Played"

    if (formData.opponent && (formData.date || notPlayed)) {
      const fixtureData = {
        ...formData,
        date: notPlayed ? "" : formData.date,
        time: notPlayed ? "" : formData.time,
        result: normalizedResult,
        score: notPlayed ? "" : formData.score,
        team: getTeamIdFromKickoffTime(formData.time, formData.team),
        status: notPlayed ? "Upcoming" : (isResultsByDate({ date: formData.date, result: normalizedResult }) ? "Completed" : "Upcoming")
      }

      if (editingFixture) {
        await updateFixture(editingFixture.id, fixtureData)
      } else {
        await addFixture(fixtureData)
      }

      setShowModal(false)
      setEditingFixture(null)
      setFormData({
        date: "",
        time: getDefaultKickoffTime("first"),
        opponent: "",
        competition: "",
        venue: "",
        homeAway: "Home",
        team: "first",
        result: "",
        score: ""
      })
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    }
  }

  const handleEdit = (fixture) => {
    setEditingFixture(fixture)
    setFormData({
      date: fixture.date,
      time: fixture.time || getDefaultKickoffTime(getTeamIdFromKickoffTime("", fixture.team)),
      opponent: fixture.opponent,
      competition: fixture.competition || "",
      venue: fixture.venue || "",
      homeAway: fixture.homeAway || "Home",
      team: getTeamIdFromKickoffTime(fixture.time, fixture.team),
      result: fixture.result || "",
      score: fixture.score || ""
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this fixture?")) {
      await deleteFixture(id)
    }
  }

  const handleReportUpload = async (fixture, file) => {
    if (!file) return

    const allowedExtensions = ["pdf", "doc", "docx", "txt"]
    const extension = getFileExtension(file.name)

    if (!allowedExtensions.includes(extension)) {
      window.alert("Please upload a PDF, DOC, DOCX, or TXT file.")
      return
    }

    try {
      setUploadingReportFor(fixture.id)

      if (fixture.matchReport?.storagePath) {
        try {
          await deleteObject(ref(storage, fixture.matchReport.storagePath))
        } catch (error) {
          console.warn("Could not remove previous report file:", error)
        }
      }

      const fileName = `${Date.now()}-${sanitizeFileName(file.name)}`
      const storagePath = `match-reports/${fixture.id}/${fileName}`
      const reportRef = ref(storage, storagePath)

      await uploadBytes(reportRef, file)
      const downloadURL = await getDownloadURL(reportRef)

      await updateFixture(fixture.id, {
        matchReport: {
          fileName: file.name,
          url: downloadURL,
          uploadedAt: new Date().toISOString(),
          contentType: file.type || "application/octet-stream",
          size: file.size,
          storagePath
        }
      })
    } catch (error) {
      console.error("Error uploading match report:", error)
      window.alert("Could not upload report. Please try again.")
    } finally {
      setUploadingReportFor(null)
    }
  }

  const handleReportDelete = async (fixture) => {
    if (!fixture.matchReport) return

    if (!window.confirm("Remove this match report?")) return

    try {
      setUploadingReportFor(fixture.id)
      if (fixture.matchReport.storagePath) {
        try {
          await deleteObject(ref(storage, fixture.matchReport.storagePath))
        } catch (error) {
          console.warn("Could not remove report file from storage:", error)
        }
      }
      await updateFixture(fixture.id, { matchReport: null })
    } catch (error) {
      console.error("Error deleting match report:", error)
      window.alert("Could not remove report. Please try again.")
    } finally {
      setUploadingReportFor(null)
    }
  }

  const filteredFixtures = fixtures
    .filter(fixture => {
      const matchesSearch = fixture.opponent.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           fixture.competition?.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesSearch
    })
    .sort((a, b) => {
      const aHasDate = isValidDateKey(a.date)
      const bHasDate = isValidDateKey(b.date)

      if (aHasDate && bHasDate) {
        return a.date.localeCompare(b.date)
      }

      if (aHasDate && !bHasDate) return 1
      if (!aHasDate && bHasDate) return -1

      return String(a.opponent || "").localeCompare(String(b.opponent || ""))
    })

  const upcomingFixtures = filteredFixtures.filter(isUpcomingByDate)
  const completedFixtures = filteredFixtures.filter(isResultsByDate)

  const groupedUpcomingFixtures = groupFixtures(upcomingFixtures)
  const groupedCompletedFixtures = groupFixtures(completedFixtures)
  const teamFilteredUpcomingFixtures = groupedUpcomingFixtures.filter((group) => {
    if (teamView === "all") return true
    return group.fixtures.some((fixture) => getTeamIdFromKickoffTime(fixture.time, fixture.team) === teamView)
  })
  const teamFilteredCompletedFixtures = groupedCompletedFixtures.filter((group) => {
    if (teamView === "all") return true
    return group.fixtures.some((fixture) => getTeamIdFromKickoffTime(fixture.time, fixture.team) === teamView)
  })

  return (
    <div className="flex-1 p-4 md:p-6 bg-gray-50 min-h-screen overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 md:mb-6">
          <div className="flex items-start md:items-center justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-2xl md:text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-1">
                Fixtures
              </h1>
              <p className="text-sm md:text-base text-gray-600 hidden md:block">Team fixtures and match results</p>
            </div>
            {(userRole === "coach" || userRole === "super-admin") && (
              <button
                onClick={() => {
                  setShowModal(true)
                  setEditingFixture(null)
                  setFormData({
                    date: "",
                    time: getDefaultKickoffTime("first"),
                    opponent: "",
                    competition: "",
                    venue: "",
                    homeAway: "Home",
                    team: "first",
                    result: "",
                    score: ""
                  })
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
              >
              <Plus size={20} />
              Add Fixture
            </button>
            )}
          </div>
        </div>

        {showSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
            <CheckCircle className="text-green-600" size={24} />
            <p className="font-semibold text-green-800">Fixture saved successfully!</p>
          </div>
        )}

        {loading ? (
          <TableSkeleton rows={3} />
        ) : (
          <>
        {/* Search + Tabs */}
        <div className="mb-6 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search fixtures..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>
          <div className="inline-flex bg-white border-2 border-gray-200 rounded-xl p-1">
            <button
              onClick={() => handleTabChange("fixtures")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === "fixtures"
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Fixtures
            </button>
            <button
              onClick={() => handleTabChange("results")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === "results"
                  ? "bg-green-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Results
            </button>
          </div>
          <div className="inline-flex bg-white border-2 border-gray-200 rounded-xl p-1">
            <button
              onClick={() => setTeamView("all")}
              className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                teamView === "all"
                  ? "bg-slate-700 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              All Teams
            </button>
            <button
              onClick={() => setTeamView("reserve")}
              className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                teamView === "reserve"
                  ? "bg-orange-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Reserve 13:45
            </button>
            <button
              onClick={() => setTeamView("first")}
              className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                teamView === "first"
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              First 15:30
            </button>
          </div>
        </div>

        {/* Fixtures List */}
        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Upcoming Fixtures */}
          {activeTab === "fixtures" && teamFilteredUpcomingFixtures.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                <h2 className="text-xl font-bold text-gray-800">Upcoming Fixtures ({teamFilteredUpcomingFixtures.length})</h2>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {teamFilteredUpcomingFixtures.map(group => {
                  const sortedFixtures = [...group.fixtures].sort((a, b) => getTeamSortKey(a) - getTeamSortKey(b))
                  const hasNotPlayed = sortedFixtures.some(fixture => isNotPlayedResult(fixture))
                  return (
                    <div key={`${group.date}-${group.opponent}-${group.venue}-${group.homeAway}`} className="p-4 rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white hover:shadow-lg transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex flex-wrap items-center gap-2">
                              {sortedFixtures.map(teamFixture => {
                                const kickoffTime = getFixtureTime(teamFixture)
                                return (
                                  <div key={teamFixture.id} className="flex items-center gap-2">
                                    <div className="bg-blue-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold">
                                      {getTeamLabel(teamFixture)}
                                    </div>
                                    {kickoffTime && (
                                      <div className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                                        {kickoffTime}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                              <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                group.homeAway === "Home" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                              }`}>
                                {group.homeAway}
                              </div>
                              {hasNotPlayed && (
                                <div className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-700">
                                  Not Played
                                </div>
                              )}
                            </div>
                          </div>
                          <h3 className="text-lg font-black text-gray-800 mb-2">
                            vs {group.opponent}
                          </h3>
                          <div className="grid grid-cols-1 gap-2 text-xs">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar size={16} className="text-blue-500" />
                              <span className="font-semibold">{isValidDateKey(group.date) ? new Date(group.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Date not set'}</span>
                            </div>
                            {sortedFixtures.map(teamFixture => {
                              const kickoffTime = getFixtureTime(teamFixture)
                              if (!kickoffTime) return null
                              return (
                                <div key={`${teamFixture.id}-time`} className="flex items-center gap-2 text-gray-600">
                                  <Clock size={16} className="text-blue-500" />
                                  <span className="font-semibold">{kickoffTime}</span>
                                </div>
                              )
                            })}
                            {group.venue && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <MapPin size={16} className="text-blue-500" />
                                <span className="font-semibold">{group.venue}</span>
                              </div>
                            )}
                            {group.competition && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Trophy size={16} className="text-blue-500" />
                                <span className="font-semibold">{group.competition}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {(userRole === "coach" || userRole === "super-admin") && (
                          <div className="flex flex-col items-end gap-2">
                            {sortedFixtures.map(teamFixture => (
                              <div key={`${teamFixture.id}-actions`} className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEdit(teamFixture)}
                                  className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                                  title="Edit fixture"
                                >
                                  <Edit size={16} className="text-blue-600" />
                                </button>
                                <button
                                  onClick={() => handleDelete(teamFixture.id)}
                                  className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                  title="Delete fixture"
                                >
                                  <Trash2 size={16} className="text-red-600" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Completed Fixtures */}
          {activeTab === "results" && teamFilteredCompletedFixtures.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white">
                <h2 className="text-xl font-bold text-gray-800">Results ({teamFilteredCompletedFixtures.length})</h2>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {teamFilteredCompletedFixtures.map(group => {
                  const sortedFixtures = [...group.fixtures].sort((a, b) => getTeamSortKey(a) - getTeamSortKey(b))
                  return (
                    <div key={`${group.date}-${group.opponent}-${group.venue}-${group.homeAway}-completed`} className="p-4 rounded-xl border-2 border-gray-200 bg-gradient-to-br from-white to-gray-50 hover:shadow-lg transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex flex-wrap items-center gap-2">
                              {sortedFixtures.map(teamFixture => {
                                const kickoffTime = getFixtureTime(teamFixture)
                                return (
                                  <div key={teamFixture.id} className="space-y-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <div className="bg-gray-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold">
                                        {getTeamLabel(teamFixture)}
                                      </div>
                                      {kickoffTime && (
                                        <div className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                                          {kickoffTime}
                                        </div>
                                      )}
                                      <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                        teamFixture.result === "Win" ? "bg-green-100 text-green-700" :
                                        teamFixture.result === "Loss" ? "bg-red-100 text-red-700" :
                                        "bg-gray-100 text-gray-700"
                                      }`}>
                                        {teamFixture.result}
                                      </div>
                                      {teamFixture.score && (
                                        <div className="text-sm font-black text-gray-800">
                                          {teamFixture.score}
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap">
                                      <FileText size={14} className="text-gray-500" />
                                      {teamFixture.matchReport?.url ? (
                                        <>
                                          <a
                                            href={teamFixture.matchReport.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs font-semibold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1"
                                          >
                                            {teamFixture.matchReport.fileName || "Match Report"}
                                            <ExternalLink size={12} />
                                          </a>
                                          {(userRole === "coach" || userRole === "super-admin") && (
                                            <button
                                              type="button"
                                              onClick={() => handleReportDelete(teamFixture)}
                                              disabled={uploadingReportFor === teamFixture.id}
                                              className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                                            >
                                              Remove
                                            </button>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-xs text-gray-500">No report uploaded</span>
                                      )}

                                      {(userRole === "coach" || userRole === "super-admin") && (
                                        <label className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:text-purple-900 cursor-pointer">
                                          {uploadingReportFor === teamFixture.id ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                                          {uploadingReportFor === teamFixture.id ? "Uploading..." : (teamFixture.matchReport?.url ? "Replace" : "Upload")}
                                          <input
                                            type="file"
                                            accept=".pdf,.doc,.docx,.txt"
                                            className="hidden"
                                            disabled={uploadingReportFor === teamFixture.id}
                                            onChange={(e) => {
                                              const selectedFile = e.target.files?.[0]
                                              if (selectedFile) {
                                                handleReportUpload(teamFixture, selectedFile)
                                              }
                                              e.target.value = ""
                                            }}
                                          />
                                        </label>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                          <h3 className="text-lg font-black text-gray-800 mb-2">
                            vs {group.opponent}
                          </h3>
                          <div className="grid grid-cols-1 gap-2 text-xs">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar size={16} className="text-gray-500" />
                              <span className="font-semibold">{new Date(group.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                            {sortedFixtures.map(teamFixture => {
                              const kickoffTime = getFixtureTime(teamFixture)
                              if (!kickoffTime) return null
                              return (
                                <div key={`${teamFixture.id}-time`} className="flex items-center gap-2 text-gray-600">
                                  <Clock size={16} className="text-gray-500" />
                                  <span className="font-semibold">{kickoffTime}</span>
                                </div>
                              )
                            })}
                            {group.competition && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Trophy size={16} className="text-gray-500" />
                                <span className="font-semibold">{group.competition}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {(userRole === "coach" || userRole === "super-admin") && (
                          <div className="flex flex-col items-end gap-2">
                            {sortedFixtures.map(teamFixture => (
                              <div key={`${teamFixture.id}-actions`} className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEdit(teamFixture)}
                                  className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                                  title="Edit fixture"
                                >
                                  <Edit size={16} className="text-blue-600" />
                                </button>
                                <button
                                  onClick={() => handleDelete(teamFixture.id)}
                                  className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                  title="Delete fixture"
                                >
                                  <Trash2 size={16} className="text-red-600" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === "fixtures" && teamFilteredUpcomingFixtures.length === 0 && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
              <Trophy className="mx-auto text-gray-300 mb-3" size={64} />
              <p className="text-gray-500 font-medium text-lg">No upcoming fixtures found</p>
              <p className="text-gray-400 mt-1">Try adjusting your search or add a new fixture</p>
            </div>
          )}

          {activeTab === "results" && teamFilteredCompletedFixtures.length === 0 && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
              <Trophy className="mx-auto text-gray-300 mb-3" size={64} />
              <p className="text-gray-500 font-medium text-lg">No results found</p>
              <p className="text-gray-400 mt-1">Completed matches will appear here</p>
            </div>
          )}
        </div>
      </>
        )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600">
              <h2 className="text-2xl font-bold text-white">
                {editingFixture ? "Edit Fixture" : "Add New Fixture"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none"
                    style={{ colorScheme: 'light' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => {
                      const nextTime = e.target.value
                      const inferredTeam = getTeamIdFromKickoffTime(nextTime, formData.team)
                      setFormData({ ...formData, time: nextTime, team: inferredTeam })
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none"
                    style={{ colorScheme: 'light' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Opponent *</label>
                <input
                  type="text"
                  required
                  value={formData.opponent}
                  onChange={(e) => setFormData({ ...formData, opponent: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="e.g., Arsenal FC"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Home/Away</label>
                  <select
                    value={formData.homeAway}
                    onChange={(e) => setFormData({ ...formData, homeAway: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none bg-white"
                  >
                    <option>Home</option>
                    <option>Away</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Team</label>
                  <select
                    value={formData.team}
                    onChange={(e) => {
                      const team = e.target.value
                      setFormData({ ...formData, team, time: getDefaultKickoffTime(team) })
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="reserve">Reserve Team (13:45)</option>
                    <option value="first">First Team (15:30)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Competition</label>
                <input
                  type="text"
                  value={formData.competition}
                  onChange={(e) => setFormData({ ...formData, competition: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="e.g., Premier League, FA Cup"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Venue</label>
                <input
                  type="text"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="e.g., Wembley Stadium"
                />
              </div>

              <div className="border-t pt-5">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Match Result (Optional)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Result</label>
                    <select
                      value={formData.result}
                      onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none bg-white"
                    >
                      <option value="">Select...</option>
                      <option>Win</option>
                      <option>Draw</option>
                      <option>Loss</option>
                      <option>Not Played</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Score</label>
                    <input
                      type="text"
                      value={formData.score}
                      onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      placeholder="e.g., 2-1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-bold hover:from-blue-600 hover:to-blue-700 transition-all"
                >
                  {editingFixture ? "Update Fixture" : "Save Fixture"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingFixture(null)
                  }}
                  className="px-6 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

export default Fixtures
