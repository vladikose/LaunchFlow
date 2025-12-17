import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

const phrases = {
  en: [
    "Amazing work! You're on fire!",
    "Fantastic! Keep up the great work!",
    "You're a superstar!",
    "Incredible progress! Well done!",
    "You're crushing it!",
    "Brilliant! Another milestone achieved!",
    "You're unstoppable!",
    "Magnificent work!",
    "You're making magic happen!",
    "Outstanding achievement!"
  ],
  ru: [
    "Потрясающая работа! Ты молодец!",
    "Фантастика! Так держать!",
    "Ты настоящая звезда!",
    "Невероятный прогресс! Отлично!",
    "Ты справляешься на ура!",
    "Блестяще! Ещё одна цель достигнута!",
    "Тебя не остановить!",
    "Великолепная работа!",
    "Ты творишь магию!",
    "Выдающееся достижение!"
  ],
  zh: [
    "太棒了！你做得很好！",
    "太厉害了！继续加油！",
    "你是超级明星！",
    "进展惊人！干得好！",
    "你太厉害了！",
    "太棒了！又完成一个里程碑！",
    "你势不可挡！",
    "出色的工作！",
    "你在创造奇迹！",
    "杰出的成就！"
  ]
};

interface UnicornCelebrationProps {
  show: boolean;
  onClose: () => void;
}

export function UnicornCelebration({ show, onClose }: UnicornCelebrationProps) {
  const { i18n } = useTranslation();
  const [phrase, setPhrase] = useState("");

  useEffect(() => {
    if (show) {
      const lang = i18n.language.startsWith("zh") ? "zh" : 
                   i18n.language.startsWith("ru") ? "ru" : "en";
      const langPhrases = phrases[lang];
      const randomPhrase = langPhrases[Math.floor(Math.random() * langPhrases.length)];
      setPhrase(randomPhrase);

      const timer = setTimeout(() => {
        onClose();
      }, 3500);

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
          className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
          data-testid="unicorn-celebration"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180, opacity: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 260, 
              damping: 20,
              duration: 0.6 
            }}
            className="relative flex flex-col items-center pointer-events-auto"
            onClick={onClose}
          >
            <motion.div
              animate={{ 
                y: [0, -15, 0],
                rotate: [-5, 5, -5]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 1.5,
                ease: "easeInOut"
              }}
              className="text-[120px] leading-none select-none cursor-pointer drop-shadow-2xl"
              style={{ filter: "drop-shadow(0 10px 30px rgba(147, 51, 234, 0.4))" }}
            >
              🦄
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-2xl shadow-2xl"
              style={{ 
                boxShadow: "0 20px 60px -10px rgba(147, 51, 234, 0.5)",
              }}
            >
              <motion.p
                animate={{ 
                  scale: [1, 1.02, 1]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 2,
                  ease: "easeInOut"
                }}
                className="text-white text-xl font-bold text-center max-w-xs"
                style={{ textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}
              >
                {phrase}
              </motion.p>
            </motion.div>

            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute text-2xl"
                  initial={{ 
                    x: 60, 
                    y: 60,
                    opacity: 1,
                    scale: 0
                  }}
                  animate={{ 
                    x: 60 + Math.cos(i * 30 * Math.PI / 180) * 150,
                    y: 60 + Math.sin(i * 30 * Math.PI / 180) * 150,
                    opacity: [1, 1, 0],
                    scale: [0, 1.2, 0.8],
                    rotate: [0, 360]
                  }}
                  transition={{ 
                    duration: 1.5,
                    delay: i * 0.05,
                    ease: "easeOut"
                  }}
                >
                  {["✨", "⭐", "💫", "🌟", "💖", "🎉"][i % 6]}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
