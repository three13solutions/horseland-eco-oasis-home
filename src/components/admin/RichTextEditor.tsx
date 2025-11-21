import React, { useMemo, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { Code, Eye } from 'lucide-react';
import DOMPurify from 'dompurify';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// Sanitize HTML without modifying structure
const sanitizeContent = (html: string): string => {
  if (!html) return '';
  
  // Only sanitize for security, don't modify structure
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                    'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'img', 'span', 'div',
                    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'b', 'i', 'sub', 'sup'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel', 'width', 'height'],
    KEEP_CONTENT: true
  });
};

// Format HTML for better readability in code mode
const formatHTML = (html: string): string => {
  if (!html) return '';
  
  let formatted = html;
  let indent = 0;
  const indentStr = '  ';
  
  // Add newlines after block-level tags
  formatted = formatted.replace(/(<\/?(p|div|h[1-6]|ul|ol|li|blockquote|pre|table|thead|tbody|tr|th|td)([^>]*)>)/gi, '\n$1\n');
  
  // Split by newlines and indent
  const lines = formatted.split('\n').filter(line => line.trim());
  
  formatted = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    
    // Decrease indent for closing tags
    if (trimmed.match(/^<\/(p|div|h[1-6]|ul|ol|li|blockquote|pre|table|thead|tbody|tr)>/i)) {
      indent = Math.max(0, indent - 1);
    }
    
    const result = indentStr.repeat(indent) + trimmed;
    
    // Increase indent for opening tags
    if (trimmed.match(/^<(p|div|h[1-6]|ul|ol|li|blockquote|pre|table|thead|tbody|tr)([^>]*)>$/i) && 
        !trimmed.match(/^<(p|div|h[1-6]|ul|ol|li|blockquote|pre|table|thead|tbody|tr)([^>]*)>.*<\/\1>$/i)) {
      indent++;
    }
    
    return result;
  }).join('\n');
  
  return formatted;
};

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [codeValue, setCodeValue] = useState('');

  // Format HTML when switching to code mode
  React.useEffect(() => {
    if (isCodeMode) {
      setCodeValue(formatHTML(value));
    }
  }, [isCodeMode, value]);

  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      ['link', 'image'],
      [{ 'color': [] }, { 'background': [] }],
      ['clean']
    ],
    clipboard: {
      matchVisual: false
    }
  }), []);

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'align',
    'blockquote', 'code-block',
    'link', 'image',
    'color', 'background'
  ];

  const handleVisualChange = (content: string) => {
    // Only sanitize, don't modify structure
    const sanitized = sanitizeContent(content);
    onChange(sanitized);
  };

  const handleCodeChange = (content: string) => {
    setCodeValue(content);
    // Only sanitize, don't modify structure
    const sanitized = sanitizeContent(content);
    onChange(sanitized);
  };

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="bg-muted px-3 py-2 border-b flex items-center justify-between">
        <span className="text-sm font-medium">
          {isCodeMode ? 'HTML Source' : 'Visual Editor'}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsCodeMode(!isCodeMode)}
          className="gap-2"
        >
          {isCodeMode ? (
            <>
              <Eye className="w-4 h-4" />
              Visual
            </>
          ) : (
            <>
              <Code className="w-4 h-4" />
              Code
            </>
          )}
        </Button>
      </div>
      
      {isCodeMode ? (
        <textarea
          value={codeValue}
          onChange={(e) => handleCodeChange(e.target.value)}
          className="w-full min-h-[300px] p-4 font-mono text-sm bg-background focus:outline-none resize-y"
          placeholder={placeholder}
          spellCheck={false}
        />
      ) : (
        <ReactQuill
          theme="snow"
          value={value || ''}
          onChange={handleVisualChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          className="bg-background"
          preserveWhitespace
        />
      )}
    </div>
  );
};

export default RichTextEditor;
