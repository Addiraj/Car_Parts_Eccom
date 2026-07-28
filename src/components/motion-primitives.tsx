import { motion, useMotionValue, useSpring, useTransform, type MotionProps } from "framer-motion";
import { useRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

export function Reveal({
  children, className, delay = 0, y = 24, once = true,
}: { children: ReactNode; className?: string; delay?: number; y?: number; once?: boolean }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration: 0.9, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({
  children, className, gap = 0.08,
}: { children: ReactNode; className?: string; gap?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={{ show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease } },
};

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return <motion.div className={className} variants={staggerItem}>{children}</motion.div>;
}

type MagneticProps = ComponentPropsWithoutRef<"button"> & MotionProps & { strength?: number };

export function MagneticButton({ children, className, strength = 0.25, ...props }: MagneticProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 18, mass: 0.3 });
  const sy = useSpring(y, { stiffness: 200, damping: 18, mass: 0.3 });

  return (
    <motion.button
      ref={ref}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        x.set((e.clientX - r.left - r.width / 2) * strength);
        y.set((e.clientY - r.top - r.height / 2) * strength);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ x: sx, y: sy }}
      className={cn("relative", className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export function TiltCard({ children, className, max = 6 }: { children: ReactNode; className?: string; max?: number }) {
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 180, damping: 20 });
  const sry = useSpring(ry, { stiffness: 180, damping: 20 });
  const transform = useTransform([srx, sry], ([a, b]) => `perspective(1000px) rotateX(${a}deg) rotateY(${b}deg)`);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <motion.div
      ref={ref}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        ry.set(px * max);
        rx.set(-py * max);
      }}
      onMouseLeave={() => { rx.set(0); ry.set(0); }}
      style={{ transform }}
      className={cn("will-change-transform", className)}
    >
      {children}
    </motion.div>
  );
}

export function FadeIn({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div className={className} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay, ease }}>
      {children}
    </motion.div>
  );
}
