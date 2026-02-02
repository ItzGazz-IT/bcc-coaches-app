import { useState } from "react"
import { Star, Search, MessageSquare, Calendar, Clock, User, Trash2, Edit, CheckCircle, X, Plus } from "lucide-react"
import { useApp } from "../contexts/AppContext"

function Reviews() {
  const { players, reviews, addReview, updateReview, deleteReview } = useApp()
  
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [showPlayerModal, setShowPlayerModal] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [editingReview, setEditingReview] = useState(null)
  const [formData, setFormData] = useState({
    rating: 5,
    comment: "",
    strengths: "",
    areasForImprovement: ""
  })
  const [showSuccess, setShowSuccess] = useState(false)

  const handlePlayerSelect = (player) => {
    setSelectedPlayer(player)
    setShowPlayerModal(true)
    setShowReviewForm(false)
    setEditingReview(null)
  }

  const handleAddNewReview = () => {
    setShowReviewForm(true)
    setEditingReview(null)
    setFormData({
      rating: 5,
      comment: "",
      strengths: "",
      areasForImprovement: ""
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedPlayer) {
      const now = new Date()
      const reviewData = {
        playerId: selectedPlayer.id,
        playerName: `${selectedPlayer.firstName} ${selectedPlayer.lastName}`,
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        timestamp: now.toISOString(),
        ...formData
      }

      if (editingReview) {
        await updateReview(editingReview.id, reviewData)
      } else {
        await addReview(reviewData)
      }

      setShowReviewForm(false)
      setEditingReview(null)
      setFormData({ rating: 5, comment: "", strengths: "", areasForImprovement: "" })
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    }
  }

  const handleEdit = (review) => {
    setEditingReview(review)
    setFormData({
      rating: review.rating,
      comment: review.comment || "",
      strengths: review.strengths || "",
      areasForImprovement: review.areasForImprovement || ""
    })
    setShowReviewForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this review?")) {
      await deleteReview(id)
    }
  }

  const filteredPlayers = players.filter(player =>
    player.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.lastName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getPlayerReviews = (playerId) => {
    return reviews
      .filter(r => r.playerId === playerId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }

  return (
    <div className="flex-1 p-4 md:p-6 bg-gray-50 min-h-screen overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 md:mb-6">
          <h1 className="text-2xl md:text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-1">
            Reviews
          </h1>
          <p className="text-sm md:text-base text-gray-600 hidden md:block">Player performance reviews</p>
        </div>

        {showSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
            <CheckCircle className="text-green-600" size={24} />
            <p className="font-semibold text-green-800">Review saved successfully!</p>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
            />
          </div>
        </div>

        {/* Players Grid */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800">All Players</h2>
            <p className="text-sm text-gray-500 mt-1">Click on a player to view and manage their reviews</p>
          </div>

          <div className="p-6">
            {filteredPlayers.length === 0 ? (
              <div className="text-center py-12">
                <User className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-gray-500 font-medium">No players found</p>
                <p className="text-gray-400 text-sm mt-1">Try adjusting your search</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPlayers.map(player => {
                  const playerReviews = getPlayerReviews(player.id)
                  const latestReview = playerReviews[0]
                  
                  return (
                    <button
                      key={player.id}
                      onClick={() => handlePlayerSelect(player)}
                      className="p-5 rounded-xl border-2 border-gray-200 bg-white hover:bg-purple-50 hover:border-purple-300 hover:shadow-lg transition-all text-left"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-800 mb-1">
                            {player.firstName} {player.lastName}
                          </h3>
                          <p className="text-sm text-gray-500">{player.position}</p>
                        </div>
                        <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-lg text-sm font-bold">
                          {playerReviews.length}
                        </div>
                      </div>
                      
                      {latestReview ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={14}
                                className={i < latestReview.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar size={12} />
                              <span>{latestReview.date}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock size={12} />
                              <span>{latestReview.time}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">No reviews yet</p>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Player Reviews Modal */}
      {showPlayerModal && selectedPlayer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-purple-600 p-6 border-b border-purple-700 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {selectedPlayer.firstName} {selectedPlayer.lastName}
                </h2>
                <p className="text-purple-100 text-sm">{selectedPlayer.position}</p>
              </div>
              <button
                onClick={() => {
                  setShowPlayerModal(false)
                  setSelectedPlayer(null)
                  setShowReviewForm(false)
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={24} className="text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">{showReviewForm ? (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(rating => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setFormData({ ...formData, rating })}
                          className="p-2 transition-transform hover:scale-110"
                        >
                          <Star
                            size={32}
                            className={rating <= formData.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Comments</label>
                    <textarea
                      value={formData.comment}
                      onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                      rows="4"
                      placeholder="General comments about performance..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Strengths</label>
                    <textarea
                      value={formData.strengths}
                      onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                      rows="3"
                      placeholder="What is the player doing well..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Areas for Improvement</label>
                    <textarea
                      value={formData.areasForImprovement}
                      onChange={(e) => setFormData({ ...formData, areasForImprovement: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                      rows="3"
                      placeholder="What areas need work..."
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowReviewForm(false)
                        setEditingReview(null)
                      }}
                      className="btn btn-secondary flex-1 text-sm md:text-base"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-purple flex-1 inline-flex items-center justify-center gap-2 text-sm md:text-base"
                    >
                      <CheckCircle size={18} />
                      {editingReview ? "Update Review" : "Save Review"}
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-800">Review History</h3>
                    <button
                      onClick={handleAddNewReview}
                      className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
                    >
                      <Plus size={18} />
                      Add New Review
                    </button>
                  </div>

                  {getPlayerReviews(selectedPlayer.id).length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="mx-auto text-gray-300 mb-3" size={48} />
                      <p className="text-gray-500 font-medium">No reviews yet</p>
                      <p className="text-gray-400 text-sm mt-1">Click "Add New Review" to create the first one</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {getPlayerReviews(selectedPlayer.id).map(review => (
                        <div key={review.id} className="p-5 rounded-xl border-2 border-gray-200 bg-gradient-to-br from-white to-gray-50 hover:border-purple-300 transition-all">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Calendar size={14} />
                                  <span className="font-semibold">{review.date}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock size={14} />
                                  <span>{review.time}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    size={18}
                                    className={i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
                                  />
                                ))}
                              </div>
                              <button
                                onClick={() => handleEdit(review)}
                                className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Edit review"
                              >
                                <Edit size={16} className="text-blue-600" />
                              </button>
                              <button
                                onClick={() => handleDelete(review.id)}
                                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                title="Delete review"
                              >
                                <Trash2 size={16} className="text-red-600" />
                              </button>
                            </div>
                          </div>

                          {review.comment && (
                            <div className="mb-3 bg-blue-50 rounded-lg p-3 border border-blue-200">
                              <p className="text-xs font-bold text-blue-700 uppercase mb-1">Comments</p>
                              <p className="text-gray-700">{review.comment}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {review.strengths && (
                              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                <p className="text-xs font-bold text-green-700 uppercase mb-1">Strengths</p>
                                <p className="text-sm text-gray-700">{review.strengths}</p>
                              </div>
                            )}
                            {review.areasForImprovement && (
                              <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                                <p className="text-xs font-bold text-orange-700 uppercase mb-1">Areas for Improvement</p>
                                <p className="text-sm text-gray-700">{review.areasForImprovement}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Reviews