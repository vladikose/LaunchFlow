import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import unicornImage from "@assets/generated_images/cute_kawaii_unicorn_mascot.png";

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
    "Outstanding achievement!",
    "So proud of you!",
    "You did it! Celebration time!",
    "Keep shining bright!",
    "You're absolutely amazing!",
    "Victory dance time!"
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
    "Выдающееся достижение!",
    "Горжусь тобой!",
    "Ты справился! Время праздновать!",
    "Продолжай сиять!",
    "Ты просто невероятный!",
    "Время танцевать от радости!"
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
    "杰出的成就！",
    "为你感到骄傲！",
    "你做到了！庆祝时间！",
    "继续闪耀！",
    "你真是太棒了！",
    "跳舞庆祝吧！"
  ]
};

type AnimationType = "dance" | "hug" | "kiss" | "jump" | "spin" | "wave";

type AnimationConfig = {
  rotate?: number[];
  y?: number[];
  x?: number[];
  scale?: number[];
};

const animations: Record<AnimationType, { 
  unicorn: AnimationConfig; 
  transition: { duration: number; ease: string };
}> = {
  dance: {
    unicorn: {
      rotate: [-10, 10, -10, 10, -10, 10, 0],
      y: [0, -20, 0, -20, 0, -20, 0],
      scale: [1, 1.05, 1, 1.05, 1, 1.05, 1]
    },
    transition: { duration: 2, ease: "easeInOut" }
  },
  hug: {
    unicorn: {
      scale: [1, 1.3, 1.3, 1.3, 1],
      x: [0, 0, 0, 0, 0],
    },
    transition: { duration: 2.5, ease: "easeInOut" }
  },
  kiss: {
    unicorn: {
      scale: [1, 1.1, 1.2, 1.1, 1],
      y: [0, -30, -50, -30, 0],
    },
    transition: { duration: 2, ease: "easeOut" }
  },
  jump: {
    unicorn: {
      y: [0, -80, 0, -60, 0, -40, 0],
      scale: [1, 0.9, 1.1, 0.95, 1.05, 1, 1],
      rotate: [0, -5, 5, -3, 3, 0, 0]
    },
    transition: { duration: 1.8, ease: "easeOut" }
  },
  spin: {
    unicorn: {
      rotate: [0, 360, 720],
      scale: [1, 1.1, 1]
    },
    transition: { duration: 1.5, ease: "easeInOut" }
  },
  wave: {
    unicorn: {
      rotate: [-15, 15, -15, 15, -15, 15, 0],
      x: [-10, 10, -10, 10, -10, 10, 0]
    },
    transition: { duration: 2, ease: "easeInOut" }
  }
};

const animationTypes: AnimationType[] = ["dance", "hug", "kiss", "jump", "spin", "wave"];

interface UnicornCelebrationProps {
  show: boolean;
  onClose: () => void;
}

export function UnicornCelebration({ show, onClose }: UnicornCelebrationProps) {
  const { i18n } = useTranslation();
  const [phrase, setPhrase] = useState("");
  const [currentAnimation, setCurrentAnimation] = useState<AnimationType>("dance");
  const [hearts, setHearts] = useState<{ id: number; x: number; delay: number }[]>([]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (show) {
      const lang = i18n.language.startsWith("zh") ? "zh" : 
                   i18n.language.startsWith("ru") ? "ru" : "en";
      const langPhrases = phrases[lang];
      const randomPhrase = langPhrases[Math.floor(Math.random() * langPhrases.length)];
      setPhrase(randomPhrase);

      const randomAnimation = animationTypes[Math.floor(Math.random() * animationTypes.length)];
      setCurrentAnimation(randomAnimation);

      if (randomAnimation === "kiss" || randomAnimation === "hug") {
        const newHearts = Array.from({ length: 8 }, (_, i) => ({
          id: i,
          x: Math.random() * 200 - 100,
          delay: Math.random() * 0.5
        }));
        setHearts(newHearts);
      } else {
        setHearts([]);
      }

      const timer = setTimeout(() => {
        handleClose();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [show, i18n.language, handleClose]);

  const anim = animations[currentAnimation];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/20 backdrop-blur-sm"
          onClick={handleClose}
          data-testid="unicorn-celebration"
        >
          <motion.div
            initial={{ scale: 0, y: 100 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: 100, opacity: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 15
            }}
            className="relative flex flex-col items-center cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <motion.img
                src={unicornImage}
                alt="Celebration Unicorn"
                className="w-48 h-48 object-contain drop-shadow-2xl"
                animate={anim.unicorn}
                transition={anim.transition}
                style={{ 
                  filter: "drop-shadow(0 20px 40px rgba(219, 39, 119, 0.4))"
                }}
              />

              {hearts.map((heart) => (
                <motion.div
                  key={heart.id}
                  className="absolute text-3xl pointer-events-none"
                  style={{ left: "50%", top: "20%" }}
                  initial={{ 
                    opacity: 0, 
                    scale: 0,
                    x: 0,
                    y: 0
                  }}
                  animate={{ 
                    opacity: [0, 1, 1, 0],
                    scale: [0, 1.2, 1, 0.8],
                    x: heart.x,
                    y: -120 - Math.random() * 60
                  }}
                  transition={{ 
                    duration: 2,
                    delay: heart.delay,
                    ease: "easeOut"
                  }}
                >
                  {currentAnimation === "kiss" ? "💋" : "💖"}
                </motion.div>
              ))}

              {currentAnimation === "spin" && (
                <>
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute text-xl pointer-events-none"
                      style={{ left: "50%", top: "50%" }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: [0, 1, 0],
                        scale: [0, 1.5, 0],
                        x: Math.cos(i * 60 * Math.PI / 180) * 100,
                        y: Math.sin(i * 60 * Math.PI / 180) * 100,
                      }}
                      transition={{
                        duration: 1.5,
                        delay: i * 0.1,
                        ease: "easeOut"
                      }}
                    >
                      {["✨", "⭐", "🌟", "💫", "🎉", "🦋"][i]}
                    </motion.div>
                  ))}
                </>
              )}
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.5, type: "spring" }}
              className="mt-6 px-8 py-4 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 rounded-2xl shadow-2xl max-w-sm"
              style={{ 
                boxShadow: "0 25px 50px -12px rgba(219, 39, 119, 0.5)",
              }}
            >
              <motion.p
                animate={{ 
                  scale: [1, 1.03, 1]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 2,
                  ease: "easeInOut"
                }}
                className="text-white text-xl font-bold text-center"
                style={{ textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}
              >
                {phrase}
              </motion.p>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 1.5 }}
              className="mt-4 text-sm text-white/70"
            >
              {i18n.language.startsWith("ru") ? "Нажмите, чтобы закрыть" : 
               i18n.language.startsWith("zh") ? "点击关闭" : "Click to close"}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
