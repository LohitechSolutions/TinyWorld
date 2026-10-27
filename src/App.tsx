import { lazy, Suspense } from 'react'
import { SCREENS } from './game/types'
import { ErrorScreen } from './screens/ErrorScreen'
import { LoadingScreen } from './screens/LoadingScreen'
import { MainMenu } from './screens/MainMenu'
import { WorldSelection } from './screens/WorldSelection'
import { useGameStore } from './store/gameStore'

const HowToPlayScreen = lazy(() => import('./screens/HowToPlayScreen').then((mod) => ({ default: mod.HowToPlayScreen })))
const SettingsScreen = lazy(() => import('./screens/SettingsScreen').then((mod) => ({ default: mod.SettingsScreen })))
const CreditsScreen = lazy(() => import('./screens/CreditsScreen').then((mod) => ({ default: mod.CreditsScreen })))
const GameScreen = lazy(() => import('./screens/GameScreen').then((mod) => ({ default: mod.GameScreen })))

export default function App() {
  const screen = useGameStore((state) => state.screen)
  const currentWorld = useGameStore((state) => state.currentWorld)
  const inWorld =
    Boolean(currentWorld) &&
    (screen === SCREENS.PLAYING ||
      screen === SCREENS.PAUSED ||
      screen === SCREENS.COMPLETE ||
      screen === SCREENS.ENDING ||
      screen === SCREENS.SETTINGS)

  return (
    <div className="app">
      {screen === SCREENS.LOADING ? <LoadingScreen /> : null}
      {screen === SCREENS.MENU ? <MainMenu /> : null}
      <Suspense fallback={null}>
        {screen === SCREENS.HOWTO ? <HowToPlayScreen /> : null}
        {screen === SCREENS.WORLDS ? <WorldSelection /> : null}
        {screen === SCREENS.SETTINGS && !currentWorld ? <SettingsScreen /> : null}
        {screen === SCREENS.CREDITS ? <CreditsScreen /> : null}
        {inWorld ? <GameScreen /> : null}
      </Suspense>
      {screen === SCREENS.ERROR ? <ErrorScreen /> : null}
    </div>
  )
}
