/**
 * VI V3 + Phase 1 — DashboardScreen
 * ====================================
 * Surgical changes vs V3:
 *   1. Imports: useNavigate (already present), useLanguage, LanguageSelector, referralsApi
 *   2. BottomNav: "Videos" → "Subscribe" (/subscription), "Library" → "Refer" (/referral)
 *   3. loadData useEffect: auto-generates referral code on mount
 *   4. Header: LanguageSelector compact added next to profile icon
 * All V3 task logic, streak, progress, tabs — 100% unchanged.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useApp } from '../context/AppContext'
import { useLanguage } from '../context/LanguageContext'
import { trackingApi, referralsApi } from '../utils/api'
import { BODY_TYPES } from '../utils/bodyTypes'
import { SmallRing, GoldBtn, SectionTitle, Card } from '../components/UI'
import { C, G } from '../constants/colors'
import LanguageSelector from '../components/LanguageSelector'

// ── Bottom Nav (Phase 1: Subscribe + Refer replace Videos + Library) ──
function BottomNav({ active, onChange }) {
  const navigate = useNavigate()
  const { t }    = useLanguage()

  const tabs = [
    { id: 'plan',      icon: '📦', label: 'My Plan',    route: null },
    { id: 'progress',  icon: '📈', label: 'Progress',   route: null },
    { id: 'subscribe', icon: '🔔', label: 'Subscribe',  route: '/subscription' },
    { id: 'refer',     icon: '🎁', label: 'Refer & Earn', route: '/referral' },
    { id: 'care',      icon: '❤️', label: 'Care',       route: null },
  ]

  const handleTab = (tab) => {
    if (tab.route) {
      navigate(tab.route)
    } else {
      onChange(tab.id)
    }
  }

  return (
    <div style={{ background: C.white, borderTop: `1px solid ${C.border}`,
      display: 'flex', padding: '8px 0 16px', flexShrink: 0,
      boxShadow: '0 -4px 16px rgba(0,0,0,0.07)' }}>
      {tabs.map(tab => (
        <div key={tab.id} onClick={() => handleTab(tab)}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
          <div style={{ fontSize: 19, filter: active === tab.id ? 'none' : 'grayscale(1) opacity(.4)' }}>{tab.icon}</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: active === tab.id ? C.gold : C.subtle }}>{tab.label}</div>
          {active === tab.id && <div style={{ width: 20, height: 2.5, background: G.gold, borderRadius: 2 }} />}
        </div>
      ))}
    </div>
  )
}

// ── Streak Ring ────────────────────────────────────────────────
function StreakRing({ streak, compliance }) {
  const r = 28, circ = 2 * Math.PI * r
  const progress = Math.min(compliance / 100, 1)
  return (
    <svg width="70" height="70" viewBox="0 0 70 70">
      <circle cx="35" cy="35" r={r} fill="none" stroke={C.border} strokeWidth="5" />
      <circle cx="35" cy="35" r={r} fill="none" stroke={C.gold} strokeWidth="5"
        strokeDasharray={`${circ * progress} ${circ}`}
        strokeLinecap="round" transform="rotate(-90 35 35)" />
      <text x="35" y="38" textAnchor="middle" fontSize="14" fontWeight="800" fill={C.text}>{streak}</text>
      <text x="35" y="48" textAnchor="middle" fontSize="7" fill={C.muted}>streak</text>
    </svg>
  )
}

// ── Task Item ──────────────────────────────────────────────────
function TaskItem({ task, done, onToggle }) {
  return (
    <div onClick={() => onToggle(task.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 8,
        background: done ? C.goldBg : C.bgMid,
        border: `1px solid ${done ? C.goldBorder : C.border}`,
        borderRadius: 12, cursor: 'pointer', transition: 'all .2s',
      }}>
      <div style={{
        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
        background: done ? G.gold : 'transparent',
        border: done ? 'none' : `2px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: C.onGold, fontSize: 13, transition: 'all .2s',
      }}>{done ? '✓' : ''}</div>
      <div style={{ flex: 1 }}>
        <div style={{ color: done ? C.muted : C.text, fontSize: 13,
          textDecoration: done ? 'line-through' : 'none' }}>
          {task.icon} {task.label}
        </div>
        <div style={{ color: C.subtle, fontSize: 10, marginTop: 2, textTransform: 'capitalize' }}>
          {task.time}
        </div>
      </div>
      {!done && (
        <div style={{ background: C.goldBg, border: `1px solid ${C.goldBorder}`,
          borderRadius: 20, padding: '3px 10px', color: C.gold, fontSize: 11 }}>
          Do Now
        </div>
      )}
    </div>
  )
}

// ── Journey Progress Bar ───────────────────────────────────────
function JourneyBar({ dayNumber }) {
  const weekNum   = Math.ceil(dayNumber / 7)
  const totalWeeks = 12
  const weeks = [
    { w: 1, l: 'Energy' }, { w: 2, l: 'Control' },
    { w: 3, l: 'Perform' }, { w: 4, l: 'Conf' },
  ]
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ color: C.text, fontSize: 16, fontWeight: 700 }}>Your Journey</div>
        <div style={{ color: C.muted, fontSize: 12 }}>Week {weekNum} of {totalWeeks}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {weeks.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', margin: '0 auto 4px',
                background: item.w < weekNum ? G.gold : 'transparent',
                border: item.w === weekNum ? `2px solid ${C.gold}` : item.w < weekNum ? 'none' : `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: item.w < weekNum ? C.onGold : item.w === weekNum ? C.gold : C.subtle,
                fontSize: 13, fontWeight: 700,
              }}>
                {item.w < weekNum ? '✓' : `W${item.w}`}
              </div>
              <div style={{ fontSize: 9, color: item.w <= weekNum ? C.gold : C.subtle }}>{item.l}</div>
            </div>
            {i < weeks.length - 1 && (
              <div style={{ height: 2, flex: 0.5, background: item.w < weekNum ? G.gold : C.border }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Score Ring ─────────────────────────────────────────────────
function ScoreRing({ label, score, max = 30, color = C.gold }) {
  const r    = 22
  const circ = 2 * Math.PI * r
  const pct  = Math.min(score / max, 1)
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke={C.border} strokeWidth="4" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${circ * pct} ${circ}`}
          strokeLinecap="round" transform="rotate(-90 28 28)" />
        <text x="28" y="33" textAnchor="middle" fontSize="12" fontWeight="800" fill={C.text}>{score}</text>
      </svg>
      <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{label}</div>
    </div>
  )
}

// ── Stub Tabs (unchanged from V3) ─────────────────────────────
function VideoTab() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: C.muted }}>
      <div style={{ fontSize: 40 }}>🎬</div>
      <div style={{ fontSize: 14 }}>Video library coming soon</div>
    </div>
  )
}

function CareTab() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: C.muted }}>
      <div style={{ fontSize: 40 }}>❤️</div>
      <div style={{ fontSize: 14 }}>Care centre coming soon</div>
    </div>
  )
}

// ── Progress Tab ───────────────────────────────────────────────
function ProgressTab({ stats, weekReport }) {
  if (!stats) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: C.muted, fontSize: 13 }}>Loading progress...</div>
    </div>
  )
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
      <SectionTitle>Your Scores</SectionTitle>
      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 24 }}>
        <ScoreRing label="Physical"    score={Math.round(stats.physicalScore    || 0)} max={30} color="#FF9500" />
        <ScoreRing label="Mental"      score={Math.round(stats.mentalScore      || 0)} max={30} color="#007AFF" />
        <ScoreRing label="Performance" score={Math.round(stats.performanceScore || 0)} max={30} color="#C9A84C" />
      </div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: C.muted, fontSize: 12 }}>Total Days Active</span>
          <span style={{ color: C.text, fontWeight: 700 }}>{stats.totalDaysActive || 0}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: C.muted, fontSize: 12 }}>Current Streak</span>
          <span style={{ color: C.gold, fontWeight: 700 }}>{stats.streak || 0} days 🔥</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: C.muted, fontSize: 12 }}>Week</span>
          <span style={{ color: C.text, fontWeight: 700 }}>{stats.weekNumber || 1} of 12</span>
        </div>
      </Card>
    </div>
  )
}

// ── My Plan Tab ────────────────────────────────────────────────
function MyPlanTab({ onProfile, stats, tasks, doneTasks, onToggleTask, loadingStats }) {
  const { state } = useApp()
  const compliance = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, color: C.subtle, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>
            {state.userName || 'Warrior'} ⚡
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LanguageSelector compact />
          <div onClick={onProfile} style={{ cursor: 'pointer' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: G.gold, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 18, color: C.onGold,
            }}>
              {(state.userName || 'V')[0].toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 16px 24px' }}>
        {/* Streak + VitaScore */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div style={{
            flex: 1, background: C.white, borderRadius: 16, padding: 14,
            display: 'flex', alignItems: 'center', gap: 10,
            border: `1px solid ${C.border}`,
          }}>
            <StreakRing streak={stats?.streak || state.currentStreak || 0} compliance={compliance} />
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Daily Streak</div>
              <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>
                {compliance}% today
              </div>
            </div>
          </div>
          <div style={{
            flex: 1, background: 'linear-gradient(135deg, #1A0800, #3A1800)',
            borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column',
            justifyContent: 'center',
          }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>VitaScore</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: C.gold, lineHeight: 1 }}>
              {loadingStats ? '--' : (stats?.vitaScore || state.vitaScore || 0)}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>out of 100</div>
          </div>
        </div>

        {/* Journey Bar */}
        <div style={{ background: C.white, borderRadius: 16, padding: 16, marginBottom: 16, border: `1px solid ${C.border}` }}>
          <JourneyBar dayNumber={stats?.activationDay || state.activationDay || 1} />
        </div>

        {/* Today's Tasks */}
        <SectionTitle style={{ marginBottom: 10 }}>
          Today's Protocol — {doneTasks.length}/{tasks.length} done
        </SectionTitle>
        {loadingStats ? (
          <div style={{ textAlign: 'center', padding: 20, color: C.muted, fontSize: 13 }}>Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: C.muted, fontSize: 13 }}>No tasks assigned yet.</div>
        ) : (
          tasks.map(task => (
            <TaskItem
              key={task.id} task={task}
              done={doneTasks.includes(task.id)}
              onToggle={onToggleTask}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── Main DashboardScreen ───────────────────────────────────────
export default function DashboardScreen() {
  const navigate = useNavigate()
  const { state, update } = useApp()
  const [activeTab,    setActiveTab]    = useState('plan')
  const [stats,        setStats]        = useState(null)
  const [tasks,        setTasks]        = useState([])
  const [doneTasks,    setDoneTasks]    = useState(state.todayTasksDone || [])
  const [weekReport,   setWeekReport]   = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const auth  = getAuth()
      const token = await auth.currentUser?.getIdToken()
      const s     = await trackingApi.stats(state.userId, token)
      setStats(s)
      update({ currentStreak: s.streak, totalDaysActive: s.totalDaysActive, weekNumber: s.weekNumber })

      const tmplDoc = await getDoc(doc(db, 'taskTemplates', state.bodyTypeId || 'PEAK_PERFORMANCE'))
      if (tmplDoc.exists()) setTasks(tmplDoc.data().tasks || [])

      const todayLog = await trackingApi.todayLog(state.userId, token)
      if (todayLog.hasLog) setDoneTasks(todayLog.log.tasksCompleted || [])

      const wr = await trackingApi.weekReport(state.userId, s.weekNumber, token)
      setWeekReport(wr)

      // Phase 1: Auto-generate referral code (idempotent — safe every mount)
      referralsApi.generate().catch(() => {})

    } catch (e) {
      console.error('Dashboard load error:', e)
    } finally {
      setLoadingStats(false)
    }
  }, [state.userId, state.bodyTypeId])

  useEffect(() => { loadData() }, [loadData])

  const handleToggleTask = useCallback(async (taskId) => {
    const next = doneTasks.includes(taskId)
      ? doneTasks.filter(id => id !== taskId)
      : [...doneTasks, taskId]

    setDoneTasks(next)
    update({ todayTasksDone: next })

    try {
      const auth  = getAuth()
      const token = await auth.currentUser?.getIdToken()
      const today = new Date().toISOString().split('T')[0]
      await trackingApi.logDay({ userId: state.userId, date: today, tasksCompleted: next }, token)
      const s = await trackingApi.stats(state.userId, token)
      setStats(s)
      update({ currentStreak: s.streak })
    } catch (e) {
      console.error('Task log error:', e)
    }
  }, [doneTasks, state.userId])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.bgMid }}>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'plan'     && <MyPlanTab onProfile={() => navigate('/profile')} stats={stats} tasks={tasks} doneTasks={doneTasks} onToggleTask={handleToggleTask} loadingStats={loadingStats} />}
        {activeTab === 'progress' && <ProgressTab stats={stats} weekReport={weekReport} />}
        {activeTab === 'videos'   && <VideoTab />}
        {activeTab === 'care'     && <CareTab />}
      </div>
      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  )
}
