import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import unicornImage from "@assets/generated_images/cute_unicorn_white_background.png";

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
    "Victory time!"
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
    "Так держать!"
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
    "加油！"
  ]
};

interface UnicornCelebrationProps {
  show: boolean;
  onClose: () => void;
}

export function UnicornCelebration({ show, onClose }: UnicornCelebrationProps) {
  const { i18n } = useTranslation();
  const [phrase, setPhrase] = useState("");

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

      const timer = setTimeout(() => {
        handleClose();
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [show, i18n.language, handleClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center pointer-events-none"
          data-testid="unicorn-celebration"
          onClick={handleClose}
        >
          <motion.img
            src={unicornImage}
            alt="Unicorn"
            className="w-48 h-48 pointer-events-auto cursor-pointer object-contain"
            style={{ mixBlendMode: "multiply" }}
            initial={{ opacity: 0, scale: 0, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{
              duration: 0.5,
              type: "spring",
              stiffness: 200,
              damping: 15
            }}
            onClick={handleClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
            className="mt-4 px-8 py-4 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 rounded-2xl shadow-2xl pointer-events-auto cursor-pointer"
            style={{ 
              boxShadow: "0 25px 50px -12px rgba(219, 39, 119, 0.5)",
            }}
            onClick={handleClose}
          >
            <p
              className="text-white text-xl font-bold text-center whitespace-nowrap"
              style={{ textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}
            >
              {phrase}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
