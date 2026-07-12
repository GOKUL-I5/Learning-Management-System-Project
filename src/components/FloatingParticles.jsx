import { motion } from 'framer-motion';
import { Book, Lightbulb, GraduationCap, Pencil, Calculator, Compass, Microscope } from 'lucide-react';
import { useMemo } from 'react';

const ICONS = [Book, Lightbulb, GraduationCap, Pencil, Calculator, Compass, Microscope];

const FloatingParticles = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      Icon: ICONS[Math.floor(Math.random() * ICONS.length)],
      size: Math.random() * 20 + 20, // 20px to 40px
      left: Math.random() * 100, // 0 to 100 vw
      top: Math.random() * 100, // 0 to 100 vh
      duration: Math.random() * 20 + 20, // 20s to 40s
      delay: Math.random() * -20, // Random start time
    }));
  }, []);

  return (
    <div className="floating-particles-container z-0">
      {particles.map((p) => {
        const { Icon } = p;
        return (
          <motion.div
            key={p.id}
            className="absolute"
            style={{ color: 'var(--text-muted)', opacity: 'var(--icon-opacity)', transition: 'all 0.3s ease' }}
            initial={{
              x: `${p.left}vw`,
              y: `${p.top}vh`,
              rotate: 0,
            }}
            animate={{
              y: [
                `${p.top}vh`,
                `${p.top - 20}vh`,
                `${p.top}vh`
              ],
              x: [
                `${p.left}vw`,
                `${p.left + 10}vw`,
                `${p.left}vw`
              ],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <Icon size={p.size} strokeWidth={1.5} />
          </motion.div>
        );
      })}
    </div>
  );
};

export default FloatingParticles;
