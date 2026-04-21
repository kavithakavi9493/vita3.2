/**
 * VI V3.2 — App.jsx
 * ==================
 * Fixed in V3.2:
 *   1. /admin route now has AdminRoute guard (was unprotected!)
 *   2. ChatBotOverlay excluded list updated
 *   3. All route guards unchanged from V3.1
 */
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AppProvider, useApp }     from './context/AppContext'
import { LanguageProvider }        from './context/LanguageContext'
import { useActivation }           from './hooks/useActivation'
import ChatBot                     from './components/ChatBot'

// Auth screens
import SplashScreen        from './screens/SplashScreen'
import SignupScreen        from './screens/SignupScreen'
import OTPScreen           from './screens/OTPScreen'
// Quiz flow
import RoutineScreen       from './screens/RoutineScreen'
import AgeGroupScreen      from './screens/AgeGroupScreen'
import Quiz1Screen         from './screens/Quiz1Screen'
import AnalyzingScreen     from './screens/AnalyzingScreen'
import Quiz2Screen         from './screens/Quiz2Screen'
import Quiz3Screen         from './screens/Quiz3Screen'
import FinalLoadingScreen  from './screens/FinalLoadingScreen'
// Post-quiz
import ResultScreen        from './screens/ResultScreen'
import RootCauseScreen     from './screens/RootCauseScreen'
import BodyAvatarScreen    from './screens/BodyAvatarScreen'
import ProductStackScreen  from './screens/ProductStackScreen'
import ActivationScreen    from './screens/ActivationScreen'
// Purchase
import CheckoutScreen      from './screens/CheckoutScreen'
import { SuccessScreen, FailureScreen } from './screens/PaymentScreens'
// Post-activation
import Day7ConversionScreen from './screens/Day7ConversionScreen'
import DashboardScreen     from './screens/DashboardScreen'
import ProfileScreen       from './screens/ProfileScreen'
import MyOrdersScreen      from './screens/MyOrdersScreen'
// Admin
import AdminScreen         from './screens/AdminScreen'
// Phase 1
import SubscriptionScreen  from './screens/SubscriptionScreen'
import ReferralScreen      from './screens/ReferralScreen'

// ── Route guards (V3 unchanged) ──────────────────────────────────
function ProtectedRoute({ children }) {
  const { state } = useApp()
  if (!state.isLoggedIn) return <Navigate to="/" replace />
  return children
}

function QuizRoute({ children }) {
  const { state } = useApp()
  if (!state.isLoggedIn)      return <Navigate to="/"          replace />
  if (state.hasCompletedQuiz) return <Navigate to="/dashboard" replace />
  return children
}

function ActivatedRoute({ children }) {
  const { state }       = useApp()
  const { isActivated } = useActivation()
  if (!state.isLoggedIn) return <Navigate to="/"              replace />
  if (!isActivated)      return <Navigate to="/product-stack" replace />
  return children
}

// ── FIXED: Admin route guard ─────────────────────────────────────
// V3.1 had /admin with NO protection — anyone could access the URL.
// V3.2 checks isAdmin from AppContext state.
function AdminRoute({ children }) {
  const { state } = useApp()
  if (!state.isLoggedIn) return <Navigate to="/" replace />
  if (!state.isAdmin)    return <Navigate to="/" replace />
  return children
}

// ── ChatBot overlay ───────────────────────────────────────────────
const CHATBOT_EXCLUDED = ['/', '/signup', '/otp', '/analyzing', '/final-loading']

function ChatBotOverlay() {
  const { state } = useApp()
  const location  = useLocation()
  if (!state.isLoggedIn || CHATBOT_EXCLUDED.includes(location.pathname)) return null
  return <ChatBot />
}

function AppRoutes() {
  return (
    <div style={{
      width: '100vw', height: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: '#D6CCB8', overflow: 'hidden',
    }}>
      <div style={{
        width: '100%', maxWidth: 430, height: '100%', maxHeight: 932,
        position: 'relative', overflow: 'hidden', background: '#F0EAE0',
        boxShadow: '0 0 60px rgba(0,0,0,0.25)',
      }}>
        <Routes>
          {/* Public */}
          <Route path="/"       element={<SplashScreen />} />
          <Route path="/signup" element={<SignupScreen  />} />
          <Route path="/otp"    element={<OTPScreen     />} />

          {/* Quiz */}
          <Route path="/routine"       element={<QuizRoute><RoutineScreen      /></QuizRoute>} />
          <Route path="/age-group"     element={<QuizRoute><AgeGroupScreen     /></QuizRoute>} />
          <Route path="/quiz-1"        element={<QuizRoute><Quiz1Screen        /></QuizRoute>} />
          <Route path="/analyzing"     element={<QuizRoute><AnalyzingScreen    /></QuizRoute>} />
          <Route path="/quiz-2"        element={<QuizRoute><Quiz2Screen        /></QuizRoute>} />
          <Route path="/quiz-3"        element={<QuizRoute><Quiz3Screen        /></QuizRoute>} />
          <Route path="/final-loading" element={<QuizRoute><FinalLoadingScreen /></QuizRoute>} />

          {/* Post-quiz */}
          <Route path="/result"        element={<ProtectedRoute><ResultScreen       /></ProtectedRoute>} />
          <Route path="/root-cause"    element={<ProtectedRoute><RootCauseScreen    /></ProtectedRoute>} />
          <Route path="/body-avatar"   element={<ProtectedRoute><BodyAvatarScreen   /></ProtectedRoute>} />
          <Route path="/product-stack" element={<ProtectedRoute><ProductStackScreen /></ProtectedRoute>} />
          <Route path="/activate"      element={<ProtectedRoute><ActivationScreen   /></ProtectedRoute>} />

          {/* Purchase */}
          <Route path="/checkout" element={<ProtectedRoute><CheckoutScreen /></ProtectedRoute>} />
          <Route path="/success"  element={<ProtectedRoute><SuccessScreen  /></ProtectedRoute>} />
          <Route path="/failure"  element={<ProtectedRoute><FailureScreen  /></ProtectedRoute>} />

          {/* Day 7 */}
          <Route path="/upgrade" element={<ProtectedRoute><Day7ConversionScreen /></ProtectedRoute>} />

          {/* Activated area */}
          <Route path="/dashboard" element={<ActivatedRoute><DashboardScreen  /></ActivatedRoute>} />
          <Route path="/profile"   element={<ActivatedRoute><ProfileScreen    /></ActivatedRoute>} />
          <Route path="/my-orders" element={<ActivatedRoute><MyOrdersScreen   /></ActivatedRoute>} />

          {/* Phase 1 */}
          <Route path="/subscription" element={<ActivatedRoute><SubscriptionScreen /></ActivatedRoute>} />
          <Route path="/referral"     element={<ActivatedRoute><ReferralScreen      /></ActivatedRoute>} />

          {/* Admin — FIXED: now behind AdminRoute guard */}
          <Route path="/admin" element={<AdminRoute><AdminScreen /></AdminRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Floating AI chatbot */}
        <ChatBotOverlay />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <AppProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </LanguageProvider>
  )
}
