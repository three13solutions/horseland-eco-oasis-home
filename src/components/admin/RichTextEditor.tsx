import React, { useMemo, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { Code, Eye } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  const [isCodeMode, setIsCodeMode] = useState(false);

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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-h-[300px] p-4 font-mono text-sm bg-background focus:outline-none resize-y"
          placeholder={placeholder}
        />
      ) : (
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          className="bg-background"
        />
      )}
    </div>
  );
};

export default RichTextEditor;
