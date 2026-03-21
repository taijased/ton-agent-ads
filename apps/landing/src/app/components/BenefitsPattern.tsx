import { motion } from "motion/react";

export function BenefitsPattern() {
  return (
    <div className="pointer-events-none absolute top-0 right-0 h-64 w-64 overflow-hidden opacity-5">
      <svg
        width="256"
        height="256"
        viewBox="0 0 256 256"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {[...Array(8)].map((_, row) => (
          <g key={row}>
            {[...Array(8)].map((_, col) => (
              <motion.circle
                key={`${row}-${col}`}
                cx={16 + col * 32}
                cy={16 + row * 32}
                r="4"
                fill="currentColor"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: (row + col) * 0.02 }}
              />
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}
