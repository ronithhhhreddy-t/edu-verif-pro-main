import * as React from "react"
import { motion, HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

export interface GlassCardProps extends HTMLMotionProps<"div"> {
  subtle?: boolean
  hover?: boolean
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, subtle = false, hover = true, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={hover ? { y: -5, scale: 1.01 } : undefined}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={cn(
          "rounded-xl overflow-hidden transition-all duration-300",
          subtle ? "glass-subtle" : "glass",
          className
        )}
        {...props}
      />
    )
  }
)
GlassCard.displayName = "GlassCard"
