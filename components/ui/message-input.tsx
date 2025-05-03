'use client'

import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUp,
  AudioLines,
  Ellipsis,
  Globe,
  Info,
  Lightbulb,
  Loader2,
  Mic,
  Palette,
  Paperclip,
  Pencil,
  Plus,
  Square,
  Telescope,
} from 'lucide-react'
import { omit } from 'remeda'

import { cn } from '@/lib/utils'
import { useAudioRecording } from '@/hooks/use-audio-recording'
import { useAutosizeTextArea } from '@/hooks/use-autosize-textarea'
import { AudioVisualizer } from '@/components/ui/audio-visualizer'
import { Button } from '@/components/ui/button'
import { FilePreview } from '@/components/ui/file-preview'
import { InterruptPrompt } from '@/components/ui/interrupt-prompt'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface MessageInputBaseProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string
  submitOnEnter?: boolean
  stop?: () => void
  isGenerating: boolean
  enableInterrupt?: boolean
  transcribeAudio?: (blob: Blob) => Promise<string>
}

interface MessageInputWithoutAttachmentProps extends MessageInputBaseProps {
  allowAttachments?: false
}

interface MessageInputWithAttachmentsProps extends MessageInputBaseProps {
  allowAttachments: true
  files: File[] | null
  setFiles: React.Dispatch<React.SetStateAction<File[] | null>>
}

type MessageInputProps = MessageInputWithoutAttachmentProps | MessageInputWithAttachmentsProps

export function MessageInput({
  placeholder = 'Ask AI...',
  className,
  onKeyDown: onKeyDownProp,
  submitOnEnter = true,
  stop,
  isGenerating,
  enableInterrupt = true,
  transcribeAudio,
  ...props
}: MessageInputProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [showInterruptPrompt, setShowInterruptPrompt] = useState(false)
  const [selectedGlob, setSelectedGlob] = useState<boolean>(false)
  const [selectedLightbulb, setSelectedLightbulb] = useState<boolean>(false)
  const [selectedTelescope, setSelectedTelescope] = useState<boolean>(false)
  const [selectedPalette, setSelectedPalette] = useState<boolean>(false)
  const [selectedCanvas, setSelectedCanvas] = useState<boolean>(false)

  const { isListening, isSpeechSupported, isRecording, isTranscribing, audioStream, toggleListening, stopRecording } =
    useAudioRecording({
      transcribeAudio,
      onTranscriptionComplete: (text) => {
        props.onChange?.({ target: { value: text } } as React.ChangeEvent<HTMLTextAreaElement>)
      },
    })

  useEffect(() => {
    if (!isGenerating) {
      setShowInterruptPrompt(false)
    }
  }, [isGenerating])

  const addFiles = (files: File[] | null) => {
    if (props.allowAttachments) {
      props.setFiles((currentFiles) => {
        if (currentFiles === null) {
          return files
        }

        if (files === null) {
          return currentFiles
        }

        return [...currentFiles, ...files]
      })
    }
  }

  const onDragOver = (event: React.DragEvent) => {
    if (props.allowAttachments !== true) return
    event.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = (event: React.DragEvent) => {
    if (props.allowAttachments !== true) return
    event.preventDefault()
    setIsDragging(false)
  }

  const onDrop = (event: React.DragEvent) => {
    setIsDragging(false)
    if (props.allowAttachments !== true) return
    event.preventDefault()
    const dataTransfer = event.dataTransfer
    if (dataTransfer.files.length) {
      addFiles(Array.from(dataTransfer.files))
    }
  }

  const onPaste = (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items
    if (!items) return

    const text = event.clipboardData.getData('text')
    if (text && text.length > 500 && props.allowAttachments) {
      event.preventDefault()
      const blob = new Blob([text], { type: 'text/plain' })
      const file = new File([blob], 'Pasted text', {
        type: 'text/plain',
        lastModified: Date.now(),
      })
      addFiles([file])
      return
    }

    const files = Array.from(items)
      .map((item) => item.getAsFile())
      .filter((file) => file !== null)

    if (props.allowAttachments && files.length > 0) {
      addFiles(files)
    }
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Backspace' || event.key === 'Delete') {
      const value = event.currentTarget.value;
      const selectionStart = event.currentTarget.selectionStart;
      
      if (value.startsWith('Create Image ') && selectionStart <= 'Create Image '.length) {
        event.preventDefault();
        const newValue = value.substring('Create Image '.length);
        props.onChange?.({ target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>);
        
        setSelectedPalette(false);
        
        setTimeout(() => {
          if (textAreaRef.current) {
            textAreaRef.current.selectionStart = 0;
            textAreaRef.current.selectionEnd = 0;
          }
        }, 0);
        return;
      }
      
      if (value.startsWith('Canvas ') && selectionStart <= 'Canvas '.length) {
        event.preventDefault();
        const newValue = value.substring('Canvas '.length);
        props.onChange?.({ target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>);
        
        setSelectedCanvas(false);
        
        setTimeout(() => {
          if (textAreaRef.current) {
            textAreaRef.current.selectionStart = 0;
            textAreaRef.current.selectionEnd = 0;
          }
        }, 0);
        return;
      }
    }

    if (submitOnEnter && event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()

      if (isGenerating && stop && enableInterrupt) {
        if (showInterruptPrompt) {
          stop()
          setShowInterruptPrompt(false)
          event.currentTarget.form?.requestSubmit()
        } else if (props.value || (props.allowAttachments && props.files?.length)) {
          setShowInterruptPrompt(true)
          return
        }
      }

      event.currentTarget.form?.requestSubmit()
    }

    onKeyDownProp?.(event)
  }

  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const [textAreaHeight, setTextAreaHeight] = useState<number>(0)

  const insertImagePrefix = () => {
    if (selectedPalette) {
      const newValue = props.value.slice('Create Image '.length)
      props.onChange?.({ target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>);
      setSelectedPalette(false)
      return
    }

    // Clear other prefixes if they exist
    let currentValue = props.value;
    if (currentValue.startsWith('Canvas ')) {
      currentValue = currentValue.substring('Canvas '.length);
      setSelectedCanvas(false);
    }
    
    const imagePrefix = 'Create Image ';
    setSelectedPalette(true);
    
    const newValue = imagePrefix + currentValue;
    props.onChange?.({ target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>);
    
    setTimeout(() => {
      if (textAreaRef.current) {
        textAreaRef.current.focus();
      }
    }, 0);
  };
  
  // New function for Canvas prefix
  const insertCanvasPrefix = () => {
    if (selectedCanvas) {
      const newValue = props.value.slice('Canvas '.length)
      props.onChange?.({ target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>);
      setSelectedCanvas(false)
      return
    }

    // Clear other prefixes if they exist
    let currentValue = props.value;
    if (currentValue.startsWith('Create Image ')) {
      currentValue = currentValue.substring('Create Image '.length);
      setSelectedPalette(false);
    }
    
    const canvasPrefix = 'Canvas ';
    setSelectedCanvas(true);
    
    const newValue = canvasPrefix + currentValue;
    props.onChange?.({ target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>);
    
    setTimeout(() => {
      if (textAreaRef.current) {
        textAreaRef.current.focus();
      }
    }, 0);
  };

  useEffect(() => {
    if (props.value) {
      if (!props.value.startsWith('Create Image ')) {
        setSelectedPalette(false);
      }
      if (!props.value.startsWith('Canvas ')) {
        setSelectedCanvas(false);
      }
    }
  }, [props.value]);

  useEffect(() => {
    if (textAreaRef.current) {
      setTextAreaHeight(textAreaRef.current.offsetHeight)
    }
  }, [props.value])

  const showFileList = props.allowAttachments && props.files && props.files.length > 0
  useAutosizeTextArea({
    ref: textAreaRef as React.RefObject<HTMLTextAreaElement>,
    maxHeight: 350,
    borderWidth: 1,
    dependencies: [props.value, showFileList],
  })

  return (
    <div className="relative flex flex-col w-full" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      {enableInterrupt && <InterruptPrompt isOpen={showInterruptPrompt} close={() => setShowInterruptPrompt(false)} />}

      <RecordingPrompt isVisible={isRecording} onStopRecording={stopRecording} />

      <div className="relative flex w-full items-center space-x-2">
        <div className="relative flex-1">
          <textarea
            aria-label="Write your prompt here"
            placeholder={placeholder}
            ref={textAreaRef}
            onPaste={onPaste}
            onKeyDown={onKeyDown}
            className={cn(
              'z-10 w-full grow resize-none rounded-xl border border-input bg-background p-3 pr-24 text-sm ring-offset-background transition-[border] placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 pb-10',
              showFileList && 'pb-16',
              className
            )}
            style={{
              caretColor: 'black',
            }}
            {...(props.allowAttachments
              ? omit(props, ['allowAttachments', 'files', 'setFiles'])
              : omit(props, ['allowAttachments']))}
          />

          {/* Create Image overlay */}
          {props.value && props.value.startsWith('Create Image ') && (
            <div 
              className="absolute top-0 left-0 pointer-events-none z-20"
              style={{
                paddingTop: '10px',
                paddingLeft: '8px'
              }}
            >
              <span 
                className="text-blue-600 font-bold text-sm"
                style={{
                  textShadow: '0 0 2px rgba(37, 99, 235, 0.5)',
                  letterSpacing: '0',
                  background: 'white',
                }}
              >
                Create Image
              </span>
              
              <span className="text-transparent font-bold">
                {' '}
              </span>
            </div>
          )}
          
          {/* Canvas overlay */}
          {props.value && props.value.startsWith('Canvas ') && (
            <div 
              className="absolute top-0 left-0 pointer-events-none z-20"
              style={{
                paddingTop: '10px',
                paddingLeft: '8px'
              }}
            >
              <span 
                className="text-blue-600 font-bold text-sm"
                style={{
                  textShadow: '0 0 2px rgba(37, 99, 235, 0.5)',
                  letterSpacing: '0',
                  background: 'white',
                }}
              >
                Canvas
              </span>
              
              <span className="text-transparent font-bold">
                {' '}
              </span>
            </div>
          )}

          {props.allowAttachments && (
            <div className="absolute inset-x-3 bottom-0 z-20 overflow-x-scroll py-3">
              <div className="flex space-x-3">
                <AnimatePresence mode="popLayout">
                  {props.files?.map((file) => {
                    return (
                      <FilePreview
                        key={file.name + String(file.lastModified)}
                        file={file}
                        onRemove={() => {
                          props.setFiles((files) => {
                            if (!files) return null

                            const filtered = Array.from(files).filter((f) => f !== file)
                            if (filtered.length === 0) return null
                            return filtered
                          })
                        }}
                      />
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex absolute w-full bottom-4 left-0 px-4 gap-2 justify-between">
        <div className="flex gap-2">
          {props.allowAttachments && (
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-9 w-9 rounded-full cursor-pointer"
              aria-label="Attach a file"
              onClick={async () => {
                const files = await showFileUploadDialog()
                addFiles(files)
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            size="icon"
            variant="outline"
            className={cn(
              "h-9 w-9 rounded-full cursor-pointer",
              selectedGlob && "bg-blue-100 text-blue-600 border-blue-100 hover:text-blue-600 hover:border-blue-100 hover:bg-blue-100"
            )}
            aria-label="Web search"
            onClick={() => {
              setSelectedTelescope(false)
              setSelectedGlob(!selectedGlob)
            }}
          >
            <Globe className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className={cn(
              "h-9 w-9 rounded-full cursor-pointer",
              selectedLightbulb && "bg-blue-100 text-blue-600 border-blue-100 hover:text-blue-600 hover:border-blue-100 hover:bg-blue-100"
            )}
            aria-label="AI suggestions"
            onClick={() => {
              setSelectedTelescope(false)
              setSelectedLightbulb(!selectedLightbulb)
            }}
          >
            <Lightbulb className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className={cn(
              "h-9 w-9 rounded-full cursor-pointer",
              selectedTelescope && "bg-blue-100 text-blue-600 border-blue-100 hover:text-blue-600 hover:border-blue-100 hover:bg-blue-100"
            )}
            aria-label="Advanced search"
            onClick={() => {
              setSelectedGlob(false)
              setSelectedLightbulb(false)
              setSelectedTelescope(!selectedTelescope)
            }}
          >
            <Telescope className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className={cn(
              "h-9 w-9 rounded-full cursor-pointer",
              selectedPalette && "bg-blue-100 text-blue-600 border-blue-100 hover:text-blue-600 hover:border-blue-100 hover:bg-blue-100"
            )}
            aria-label="Image generation"
            onClick={insertImagePrefix}
          >
            <Palette className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                size="icon" 
                variant="outline" 
                className={cn(
                  "h-9 w-9 rounded-full cursor-pointer",
                  selectedCanvas && "bg-blue-100 text-blue-600 border-blue-100 hover:text-blue-600 hover:border-blue-100 hover:bg-blue-100"
                )}
              >
                <Ellipsis className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <div
                role="menuitem"
                className="flex items-center m-1.5 p-2.5 text-sm cursor-pointer focus-visible:outline-0 radix-disabled:pointer-events-none radix-disabled:opacity-50 group relative hover:bg-[#f5f5f5] focus-visible:bg-[#f5f5f5] radix-state-open:bg-[#f5f5f5] dark:hover:bg-token-main-surface-secondary dark:focus-visible:bg-token-main-surface-secondary rounded-md my-0 mx-2 dark:radix-state-open:bg-token-main-surface-secondary gap-2.5 px-1 py-2"
                data-orientation="vertical"
                data-radix-collection-item=""
                onClick={insertCanvasPrefix}
              >
                <div className="group inline-flex w-full items-center justify-start gap-2 ps-1.5 pe-3">
                  <div className="flex h-7 w-7 items-center justify-center gap-2.5">
                  <Pencil />
                  </div>
                  <div className="shrink grow basis-0">
                    <p className="text-token-text-primary text-sm leading-tight font-normal">Canvas</p>
                    <p className="text-token-text-secondary text-[13px] leading-[18px] font-normal">
                      Collaborate on writing and code
                    </p>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex gap-2">
          {isSpeechSupported && (
            <Button
              type="button"
              variant="outline"
              className={cn('h-9 w-9 rounded-full cursor-pointer', isListening && 'text-primary')}
              aria-label="Voice input"
              size="icon"
              onClick={toggleListening}
            >
              <Mic className="h-4 w-4" />
            </Button>
          )}
          {isGenerating && stop ? (
            <Button
              type="button"
              size="icon"
              className="h-9 w-9 rounded-full cursor-pointer"
              aria-label="Stop generating"
              onClick={stop}
            >
              <Square className="h-3 w-3 animate-pulse" fill="currentColor" />
            </Button>
          ) : (
            props.value ?
            <Button
              type="submit"
              size="icon"
              className="h-9 w-9 rounded-full cursor-pointer transition-opacity"
              aria-label="Send message"
              disabled={isGenerating}
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
            :
            <Button
              type="button"
              size="icon"
              className="h-9 w-9 rounded-full cursor-pointer transition-opacity"
              aria-label="Send message"
              disabled={isGenerating}
            >
              <AudioLines className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {props.allowAttachments && <FileUploadOverlay isDragging={isDragging} />}

      <RecordingControls
        isRecording={isRecording}
        isTranscribing={isTranscribing}
        audioStream={audioStream}
        textAreaHeight={textAreaHeight}
        onStopRecording={stopRecording}
      />
    </div>
  )
}
MessageInput.displayName = 'MessageInput'

interface FileUploadOverlayProps {
  isDragging: boolean
}

function FileUploadOverlay({ isDragging }: FileUploadOverlayProps) {
  return (
    <AnimatePresence>
      {isDragging && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center space-x-2 rounded-xl border border-dashed border-border bg-background text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          aria-hidden
        >
          <Paperclip className="h-4 w-4" />
          <span>Drop your files here to attach them.</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function showFileUploadDialog() {
  const input = document.createElement('input')

  input.type = 'file'
  input.multiple = true
  input.accept = '*/*'
  input.click()

  return new Promise<File[] | null>((resolve) => {
    input.onchange = (e) => {
      const files = (e.currentTarget as HTMLInputElement).files

      if (files) {
        resolve(Array.from(files))
        return
      }

      resolve(null)
    }
  })
}

function TranscribingOverlay() {
  return (
    <motion.div
      className="flex h-full w-full flex-col items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <motion.div
          className="absolute inset-0 h-8 w-8 animate-pulse rounded-full bg-primary/20"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.2, opacity: 1 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
        />
      </div>
      <p className="mt-4 text-sm font-medium text-muted-foreground">Transcribing audio...</p>
    </motion.div>
  )
}

interface RecordingPromptProps {
  isVisible: boolean
  onStopRecording: () => void
}

function RecordingPrompt({ isVisible, onStopRecording }: RecordingPromptProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ top: 0, filter: 'blur(5px)' }}
          animate={{
            top: -40,
            filter: 'blur(0px)',
            transition: {
              type: 'spring',
              filter: { type: 'tween' },
            },
          }}
          exit={{ top: 0, filter: 'blur(5px)' }}
          className="absolute left-1/2 flex -translate-x-1/2 cursor-pointer overflow-hidden whitespace-nowrap rounded-full border bg-background py-1 text-center text-sm text-muted-foreground"
          onClick={onStopRecording}
        >
          <span className="mx-2.5 flex items-center">
            <Info className="mr-2 h-3 w-3" />
            Click to finish recording
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface RecordingControlsProps {
  isRecording: boolean
  isTranscribing: boolean
  audioStream: MediaStream | null
  textAreaHeight: number
  onStopRecording: () => void
}

function RecordingControls({
  isRecording,
  isTranscribing,
  audioStream,
  textAreaHeight,
  onStopRecording,
}: RecordingControlsProps) {
  if (isRecording) {
    return (
      <div className="absolute inset-[1px] z-50 overflow-hidden rounded-xl" style={{ height: textAreaHeight - 2 }}>
        <AudioVisualizer stream={audioStream} isRecording={isRecording} onClick={onStopRecording} />
      </div>
    )
  }

  if (isTranscribing) {
    return (
      <div className="absolute inset-[1px] z-50 overflow-hidden rounded-xl" style={{ height: textAreaHeight - 2 }}>
        <TranscribingOverlay />
      </div>
    )
  }

  return null
}
