import React from 'react';

interface GenerateButtonProps {
  onGenerate: () => void;
  onCancel: () => void;
  isGenerating: boolean;
  disabled: boolean;
}

const GenerateButton: React.FC<GenerateButtonProps> = ({
  onGenerate,
  onCancel,
  isGenerating,
  disabled,
}) => {
  return (
    <section className="generate-section">
      {isGenerating ? (
        <button className="btn btn-cancel btn-large" onClick={onCancel}>
          <span className="spinner"></span>
          Cancel Generation
        </button>
      ) : (
        <button
          className="btn btn-generate btn-large"
          onClick={onGenerate}
          disabled={disabled}
        >
          Generate Selector Racks
        </button>
      )}
    </section>
  );
};

export default GenerateButton;
