import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

interface BenefitCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
}

export function BenefitCard({
  icon: Icon,
  title,
  description,
  index,
}: BenefitCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group border-2 border-black p-6 transition-colors duration-300 hover:bg-black hover:text-white"
    >
      <Icon className="mb-3 h-8 w-8 transition-transform duration-300 group-hover:scale-110" />
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm opacity-70">{description}</p>
    </motion.div>
  );
}
