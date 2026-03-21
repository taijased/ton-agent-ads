import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

interface SolutionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
}

export function SolutionCard({
  icon: Icon,
  title,
  description,
  index,
}: SolutionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group border-2 border-white bg-white p-6 text-black transition-colors duration-300 hover:border-white hover:bg-black hover:text-white"
    >
      <Icon className="mb-4 h-8 w-8 transition-transform duration-300 group-hover:scale-110" />
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="text-sm opacity-70">{description}</p>
    </motion.div>
  );
}
