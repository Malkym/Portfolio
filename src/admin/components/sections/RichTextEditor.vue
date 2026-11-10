<script setup lang="ts">
import { watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { safeCVUrl, renderCVRichText } from '@shared/utils/cvRichText'

const props = defineProps<{ modelValue: string; placeholder?: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()
const editor = useEditor({
  content: renderCVRichText(props.modelValue),
  extensions: [StarterKit.configure({ link: { openOnClick: false } }), TextAlign.configure({ types: ['heading', 'paragraph'] })],
  editorProps: { attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-label': props.placeholder || 'Éditeur enrichi', class: 'cv-rich-editor' } },
  onUpdate: ({ editor }) => emit('update:modelValue', editor.getHTML()),
})
watch(() => props.modelValue, value => {
  if (editor.value && editor.value.getHTML() !== value) editor.value.commands.setContent(renderCVRichText(value), { emitUpdate: false })
})
function addLink() {
  const value = window.prompt('Adresse du lien (https://…) :', editor.value?.getAttributes('link').href || '')
  if (value === null) return
  if (!value.trim()) { editor.value?.chain().focus().unsetLink().run(); return }
  const url = safeCVUrl(value)
  if (url) editor.value?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}
</script>

<template>
  <div v-if="editor" class="cv-rich-shell">
    <div class="cv-rich-toolbar" role="toolbar" aria-label="Mise en forme du texte">
      <button type="button" title="Gras" aria-label="Gras" :aria-pressed="editor.isActive('bold')" @click="editor.chain().focus().toggleBold().run()"><b>G</b></button>
      <button type="button" title="Italique" aria-label="Italique" :aria-pressed="editor.isActive('italic')" @click="editor.chain().focus().toggleItalic().run()"><i>I</i></button>
      <button type="button" title="Souligné" aria-label="Souligné" :aria-pressed="editor.isActive('underline')" @click="editor.chain().focus().toggleUnderline().run()"><u>S</u></button>
      <button type="button" aria-label="Ajouter un lien" title="Ajouter un lien" @click="addLink">Lien</button>
      <button type="button" aria-label="Liste à puces" :aria-pressed="editor.isActive('bulletList')" @click="editor.chain().focus().toggleBulletList().run()">• Liste</button>
      <button type="button" aria-label="Liste numérotée" :aria-pressed="editor.isActive('orderedList')" @click="editor.chain().focus().toggleOrderedList().run()">1. Liste</button>
      <button type="button" aria-label="Annuler la saisie" :disabled="!editor.can().undo()" @click="editor.chain().focus().undo().run()">↶</button>
      <button type="button" aria-label="Rétablir la saisie" :disabled="!editor.can().redo()" @click="editor.chain().focus().redo().run()">↷</button>
    </div>
    <EditorContent :editor="editor" />
  </div>
</template>

<style scoped>
.cv-rich-shell{border:1px solid #344056;border-radius:7px;overflow:hidden;background:#0b111d}.cv-rich-shell:focus-within{border-color:#9bb7ff;box-shadow:0 0 0 3px #527bd82b}.cv-rich-toolbar{display:flex;flex-wrap:wrap;gap:3px;padding:7px;background:#151e2d;border-bottom:1px solid #344056}.cv-rich-toolbar button{font-size:12px;color:#bdcbe0;border-radius:4px;padding:5px 8px;min-width:30px}.cv-rich-toolbar button:hover,.cv-rich-toolbar button[aria-pressed=true]{background:#2a3e61;color:#fff}.cv-rich-shell :deep(.cv-rich-editor){min-height:150px;padding:14px;outline:none;font-size:13px;line-height:1.7}.cv-rich-shell :deep(p){margin-bottom:8px}.cv-rich-shell :deep(ul){list-style:disc;padding-left:20px}.cv-rich-shell :deep(ol){list-style:decimal;padding-left:20px}.cv-rich-shell :deep(a){color:#9bb7ff;text-decoration:underline}
</style>
