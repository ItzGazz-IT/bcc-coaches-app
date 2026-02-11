import { useState, useEffect } from "react"
import { CheckCircle, AlertCircle, Loader } from "lucide-react"
import { collection, addDoc, query, where, getDocs } from "firebase/firestore"
import { db } from "../firebase/config"

function InitializeCoaches() {
  const [initializing, setInitializing] = useState(false)
  const [results, setResults] = useState([])
  const [completed, setCompleted] = useState(false)

  const coaches = [
    {
      username: "Gareth",
      password: "Gareth@BCC26",
      fullName: "Gareth Van Den Aardweg",
      email: "gareth@bcc.com"
    },
    {
      username: "Goisto",
      password: "Goisto@BCC26",
      fullName: "Goisto",
      email: ""
    },
    {
      username: "Davie",
      password: "Davie@BCC26",
      fullName: "Davie",
      email: ""
    }
  ]

  const handleInitialize = async () => {
    setInitializing(true)
    setResults([])
    const newResults = []

    try {
      for (const coach of coaches) {
        try {
          // Check if coach already exists
          const q = query(collection(db, "coaches"), where("username", "==", coach.username))
          const existing = await getDocs(q)

          if (existing.empty) {
            await addDoc(collection(db, "coaches"), {
              username: coach.username,
              password: coach.password,
              fullName: coach.fullName,
              email: coach.email,
              createdAt: new Date().toISOString()
            })
            newResults.push({
              username: coach.username,
              status: "added",
              message: "Added successfully"
            })
          } else {
            newResults.push({
              username: coach.username,
              status: "exists",
              message: "Already exists"
            })
          }
        } catch (err) {
          newResults.push({
            username: coach.username,
            status: "error",
            message: err.message
          })
        }
      }

      setResults(newResults)
      setCompleted(true)
    } catch (error) {
      console.error("Error initializing coaches:", error)
    } finally {
      setInitializing(false)
    }
  }

  useEffect(() => {
    // Auto-init on page load
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('auto') === 'true') {
      handleInitialize()
    }
  }, [])

  return (
    <div className="flex-1 p-4 md:p-6 bg-gray-50 min-h-screen overflow-y-auto flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
              Initialize Coaches
            </h1>
            <p className="text-gray-600">Set up the initial coach accounts in Firestore</p>
          </div>

          {results.length === 0 && !completed ? (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium">
                  This will create 3 coach accounts:
                </p>
                <ul className="mt-3 space-y-2 text-sm text-blue-700">
                  <li>✓ <strong>Gareth</strong> (Super Admin)</li>
                  <li>✓ <strong>Goisto</strong></li>
                  <li>✓ <strong>Davie</strong></li>
                </ul>
              </div>

              <button
                onClick={handleInitialize}
                disabled={initializing}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 text-white px-6 py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3"
              >
                {initializing ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    Initializing...
                  </>
                ) : (
                  "Create Coach Accounts"
                )}
              </button>

              <p className="text-xs text-gray-500 text-center">
                This can be run multiple times - existing coaches will be skipped
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="divide-y divide-gray-100">
                {results.map(result => (
                  <div key={result.username} className="py-3 flex items-start gap-3">
                    <div className="mt-1">
                      {result.status === "added" && (
                        <CheckCircle className="text-green-600" size={20} />
                      )}
                      {result.status === "exists" && (
                        <AlertCircle className="text-yellow-600" size={20} />
                      )}
                      {result.status === "error" && (
                        <AlertCircle className="text-red-600" size={20} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{result.username}</p>
                      <p className={`text-sm ${
                        result.status === "added"
                          ? "text-green-600"
                          : result.status === "exists"
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}>
                        {result.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {completed && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-green-800 font-semibold">
                    ✓ Initialization complete!
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    You can now log in with your coach credentials
                  </p>
                  <a
                    href="/"
                    className="inline-block mt-4 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Go to Login
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default InitializeCoaches
