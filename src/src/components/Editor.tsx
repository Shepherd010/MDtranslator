import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';

interface EditorProps {
  value: string;
  onChange?: (val: string) => void;
  readOnly?: boolean;
}

export default function Editor({ value, onChange, readOnly = false }: EditorProps) {
  return (
    <div style={{ height: '100%', width: '100%', overflow: 'hidden' }}>
      <CodeMirror
        value={value}
        height="100%"
        extensions={[markdown({ base: markdownLanguage, codeLanguages: languages })]}
        onChange={(val) => onChange && onChange(val)}
        readOnly={readOnly}
        theme="light"
        style={{ height: '100%', fontSize: '14px' }}
      />
    </div>
  );
}
