import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'

/**
 * Feature Tour Component
 * Creates interactive guided tours with element highlighting
 * Shows contextual tooltips and step-by-step guidance
 */
const FeatureTour = ({ 
  isActive, 
  steps, 
  currentStep, 
  onNext, 
  onPrevious, 
  onComplete, 
  onSkip 
}) => {
  const [targetElement, setTargetElement] = useState(null)
  const [targetRect, setTargetRect] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const tooltipRef = useRef(null)

  const currentStepData = steps?.[currentStep]

  useEffect(() => {
    if (!isActive || !currentStepData?.target) return

    const updateTargetElement = () => {
      const element = document.querySelector(currentStepData.target)
      if (element) {
        setTargetElement(element)
        const rect = element.getBoundingClientRect()
        setTargetRect(rect)
        
        // Calculate tooltip position
        calculateTooltipPosition(rect)
        
        // Scroll element into view
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        })
      }
    }

    // Initial update
    updateTargetElement()

    // Update on resize
    const handleResize = () => updateTargetElement()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [isActive, currentStepData, currentStep])

  const calculateTooltipPosition = (rect) => {
    if (!tooltipRef.current) return

    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    let x = rect.left + rect.width / 2 - tooltipRect.width / 2
    let y = rect.bottom + 20

    // Adjust if tooltip goes off screen
    if (x < 10) x = 10
    if (x + tooltipRect.width > viewportWidth - 10) {
      x = viewportWidth - tooltipRect.width - 10
    }
    
    if (y + tooltipRect.height > viewportHeight - 10) {
      y = rect.top - tooltipRect.height - 20
    }

    setTooltipPosition({ x, y })
  }

  if (!isActive || !currentStepData) return null

  return createPortal(
    <AnimatePresence>
      {/* Dark Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
      >
        {/* Spotlight for target element */}
        {targetRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute border-4 border-white rounded-lg shadow-2xl"
            style={{
              left: targetRect.left - 8,
              top: targetRect.top - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              boxShadow: `
                0 0 0 9999px rgba(0, 0, 0, 0.75),
                0 0 20px rgba(59, 130, 246, 0.5),
                inset 0 0 0 4px rgba(255, 255, 255, 0.8)
              `,
              pointerEvents: 'none'
            }}
          />
        )}

        {/* Tooltip */}
        <motion.div
          ref={tooltipRef}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="absolute z-50 bg-white rounded-2xl shadow-2xl max-w-sm w-80"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y
          }}
        >
          {/* Arrow pointing to target */}
          <div 
            className="absolute w-4 h-4 bg-white transform rotate-45 -top-2 left-1/2 -translate-x-1/2"
            style={{
              boxShadow: '-1px -1px 1px rgba(0, 0, 0, 0.1)'
            }}
          />

          {/* Content */}
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center text-white text-lg">
                  {currentStepData.icon || '💡'}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">
                    {currentStepData.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Step {currentStep + 1} of {steps.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-gray-700 mb-6 leading-relaxed">
              {currentStepData.description}
            </p>

            {/* Additional content */}
            {currentStepData.tips && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <h4 className="font-semibold text-blue-800 text-sm mb-2">💡 Tip:</h4>
                <p className="text-blue-700 text-sm">{currentStepData.tips}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {currentStep > 0 && (
                  <button
                    onClick={onPrevious}
                    className="text-gray-500 hover:text-gray-700 transition-colors text-sm"
                  >
                    ← Previous
                  </button>
                )}
                <button
                  onClick={onSkip}
                  className="text-gray-500 hover:text-gray-700 transition-colors text-sm"
                >
                  Skip Tour
                </button>
              </div>

              <div className="flex items-center space-x-2">
                {/* Progress dots */}
                <div className="flex space-x-1">
                  {steps.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentStep 
                          ? 'bg-blue-500' 
                          : index < currentStep 
                            ? 'bg-green-500' 
                            : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={currentStep === steps.length - 1 ? onComplete : onNext}
                  className="bg-gradient-to-r from-blue-500 to-teal-500 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-200 font-semibold text-sm"
                >
                  {currentStep === steps.length - 1 ? 'Finish' : 'Next →'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

export default FeatureTour