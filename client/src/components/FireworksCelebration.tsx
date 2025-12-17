import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

const phrases = {
  en: [
    "Project Complete!",
    "All stages finished!",
    "Congratulations!",
    "Amazing achievement!",
    "You did it!",
  ],
  ru: [
    "Проект завершён!",
    "Все этапы выполнены!",
    "Поздравляем!",
    "Потрясающее достижение!",
    "Вы справились!",
  ],
  zh: [
    "项目完成！",
    "所有阶段已完成！",
    "恭喜！",
    "了不起的成就！",
    "你做到了！",
  ],
};

const colors = [
  "#ff0000", "#ff7700", "#ffdd00", "#00ff00", "#00ddff", "#0077ff", "#ff00ff", "#ff0077",
];

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  angle: number;
  speed: number;
  delay: number;
}

interface Firework {
  id: number;
  x: number;
  y: number;
  particles: Particle[];
}

interface FireworksCelebrationProps {
  show: boolean;
  onClose: () => void;
}

export function FireworksCelebration({ show, onClose }: FireworksCelebrationProps) {
  const { i18n } = useTranslation();
  const [phrase, setPhrase] = useState("");
  const [fireworks, setFireworks] = useState<Firework[]>([]);

  useEffect(() => {
    if (show) {
      const lang = i18n.language.startsWith("zh") ? "zh" : 
                   i18n.language.startsWith("ru") ? "ru" : "en";
      const langPhrases = phrases[lang];
      setPhrase(langPhrases[Math.floor(Math.random() * langPhrases.length)]);

      const newFireworks: Firework[] = [];
      for (let f = 0; f < 5; f++) {
        const particles: Particle[] = [];
        const centerX = 15 + Math.random() * 70;
        const centerY = 20 + Math.random() * 40;
        
        for (let p = 0; p < 20; p++) {
          particles.push({
            id: p,
            x: centerX,
            y: centerY,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 4 + Math.random() * 6,
            angle: (p / 20) * 360,
            speed: 50 + Math.random() * 100,
            delay: f * 0.3,
          });
        }
        newFireworks.push({ id: f, x: centerX, y: centerY, particles });
      }
      setFireworks(newFireworks);

      const timer = setTimeout(() => {
        onClose();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [show, i18n.language, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden"
          onClick={onClose}
          data-testid="fireworks-celebration"
        >
          {fireworks.map((firework) => (
            <div key={firework.id}>
              {firework.particles.map((particle) => (
                <motion.div
                  key={`${firework.id}-${particle.id}`}
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    left: `${particle.x}%`,
                    top: `${particle.y}%`,
                    width: particle.size,
                    height: particle.size,
                    backgroundColor: particle.color,
                    boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
                  }}
                  initial={{ 
                    opacity: 0, 
                    scale: 0,
                    x: 0,
                    y: 0,
                  }}
                  animate={{ 
                    opacity: [0, 1, 1, 0],
                    scale: [0, 1.5, 1, 0.5],
                    x: Math.cos(particle.angle * Math.PI / 180) * particle.speed,
                    y: Math.sin(particle.angle * Math.PI / 180) * particle.speed,
                  }}
                  transition={{
                    duration: 1.5,
                    delay: particle.delay,
                    ease: "easeOut",
                  }}
                />
              ))}
            </div>
          ))}

          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ delay: 0.5, duration: 0.6, type: "spring" }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-12 py-6 pointer-events-auto cursor-pointer"
            onClick={onClose}
          >
            <div 
              className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-3xl px-12 py-6"
              style={{ 
                boxShadow: "0 0 60px rgba(255, 165, 0, 0.6), 0 0 100px rgba(255, 69, 0, 0.4)",
              }}
            >
              <motion.p
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-white text-3xl font-bold text-center whitespace-nowrap"
                style={{ textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}
              >
                🎉 {phrase} 🎉
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
