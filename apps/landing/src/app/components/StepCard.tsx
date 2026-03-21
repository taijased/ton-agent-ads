import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

interface StepCardProps {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
}

export function StepCard({
  number,
  icon: Icon,
  title,
  description,
  index,
}: StepCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      className="relative"
    >
      <div className="group border-2 border-black bg-white p-8 transition-colors duration-300 hover:bg-black hover:text-white">
        <div className="absolute -top-4 -left-4 flex h-12 w-12 items-center justify-center bg-black text-xl font-bold text-white transition-colors duration-300 group-hover:bg-white group-hover:text-black">
          {number}
        </div>
        <Icon className="mb-4 h-10 w-10 transition-transform duration-300 group-hover:scale-110" />
        <h3 className="mb-3 text-2xl font-semibold">{title}</h3>
        <p className="opacity-70">{description}</p>
      </div>
    </motion.div>
  );
}
