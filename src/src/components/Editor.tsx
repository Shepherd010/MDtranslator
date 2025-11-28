import React, { useCallback, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { EditorView } from '@codemirror/view';

interface EditorProps {
  value: string;
  onChange?: (val: string) => void;
  readOnly?: boolean;
}

export default function Editor({ value, onChange, readOnly = false }: EditorProps) {
  // 使用 useCallback 确保 onChange 稳定
  const handleChange = useCallback((val: string) => {
    if (onChange) {
      onChange(val);
    }
  }, [onChange]);

  // 使用 useMemo 缓存 extensions
  const extensions = useMemo(() => [
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    EditorView.lineWrapping,
  ], []);

  return (
    <div style={{ height: '100%', width: '100%', overflow: 'hidden' }}>
      <CodeMirror
        value={value}
        height="100%"
        extensions={extensions}
        onChange={handleChange}
        readOnly={readOnly}
        theme="light"
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          foldGutter: true,
        }}
        style={{ height: '100%', fontSize: '14px' }}
      />
    </div>
  );
}
