import { Hero } from './sections/Hero'
import { ProblemSolution } from './sections/ProblemSolution'
import { Features } from './sections/Features'
import { SocialProof } from './sections/SocialProof'
import { HowItWorks } from './sections/HowItWorks'
import { Pricing } from './sections/Pricing'
import { Footer } from './sections/Footer'
import { Navbar } from './components/Navbar'

function App() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Hero />
        <ProblemSolution />
        <Features />
        <SocialProof />
        <HowItWorks />
        <Pricing />
      </main>
      <Footer />
    </div>
  )
}

export default App

