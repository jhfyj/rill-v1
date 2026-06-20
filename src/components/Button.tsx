import type { ReactNode } from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "../lib/cn";
import { AnimatedText } from "./AnimatedText";

export type ButtonVariant = "primary" | "secondary" | "tertiary";
export type ButtonSize = "sm" | "md" | "lg" | "responsive";

export interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: ReactNode;
}

const base =
  "inline-flex items-center justify-center font-body rounded-pill " +
  "transition-colors duration-150 select-none cursor-pointer " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-white " +
  "disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<ButtonVariant, string> = {
  // Solid black pill, white label.
  primary: "font-medium bg-ink text-white hover:bg-ink/85 active:bg-ink/75",
  // Outlined ink
  secondary:
    "font-medium border border-ink text-ink hover:bg-ink/5 active:bg-ink/10",
  // Text-only ink
  tertiary: "font-medium text-ink hover:text-ink/70 active:text-ink/60",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-4 text-sm",
  md: "h-9 px-5 text-sm",
  lg: "h-10 px-6 text-base",
  // Scales with the viewport: small on mobile, medium on tablet, large on
  // desktop. Each breakpoint sets the full sm/md/lg dimensions for that step.
  responsive: "h-8 px-4 text-sm sm:h-9 sm:px-5 lg:h-10 lg:px-6 lg:text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const label =
    typeof children === "string" ? <AnimatedText text={children} /> : children;

  return (
    <motion.button
      type={type}
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      <span className="relative z-[1] inline-flex items-center justify-center">
        {label}
      </span>
    </motion.button>
  );
}

export default Button;
