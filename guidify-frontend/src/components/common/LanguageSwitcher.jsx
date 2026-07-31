import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe } from 'lucide-react';

const SwitcherContainer = styled.div`
  position: relative;
  z-index: 50;
`;

const ToggleButton = styled(motion.button)`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  backdrop-filter: blur(5px);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(57, 255, 20, 0.1);
    border-color: #39FF14;
    color: #39FF14;
  }
`;

const Dropdown = styled(motion.div)`
  position: absolute;
  top: 120%;
  right: 0;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 0.5rem;
  min-width: 140px;
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`;

const LangOption = styled.button`
  background: ${props => props.$active ? 'rgba(57, 255, 20, 0.1)' : 'transparent'};
  color: ${props => props.$active ? '#39FF14' : '#A4ACBC'};
  border: none;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
`;

const languages = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिंदी (Hindi)' },
    { code: 'bn', label: 'বাংলা (Bengali)' }
];

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        setIsOpen(false);
    };

    const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

    return (
        <SwitcherContainer>
            <ToggleButton
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <Globe size={18} />
                <span>{currentLang.label.split(' ')[0]}</span>
            </ToggleButton>

            <AnimatePresence>
                {isOpen && (
                    <Dropdown
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        {languages.map((lang) => (
                            <LangOption
                                key={lang.code}
                                $active={i18n.language === lang.code}
                                onClick={() => changeLanguage(lang.code)}
                            >
                                {lang.label}
                            </LangOption>
                        ))}
                    </Dropdown>
                )}
            </AnimatePresence>
        </SwitcherContainer>
    );
};

export default LanguageSwitcher;
