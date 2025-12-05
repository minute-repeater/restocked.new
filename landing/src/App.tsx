import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Hero } from './sections/Hero'
import { ProblemSolution } from './sections/ProblemSolution'
import { Features } from './sections/Features'
import { SocialProof } from './sections/SocialProof'
import { HowItWorks } from './sections/HowItWorks'
import { Pricing } from './sections/Pricing'
import { Footer } from './sections/Footer'
import { Navbar } from './components/Navbar'
import { FeaturesPage } from './pages/FeaturesPage'
import { HowItWorksPage } from './pages/HowItWorksPage'
import { PricingPage } from './pages/PricingPage'

function HomePage() {
  return (
    <>
      <Hero />
      <ProblemSolution />
      <Features />
      <SocialProof />
      <HowItWorks />
      <Pricing />
    </>
  )
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/pricing" element={<PricingPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App




