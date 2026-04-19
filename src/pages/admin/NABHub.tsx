import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Trash2, Link as LinkIcon, FileText } from 'lucide-react'
import {
  getIntelligences,
  ingestManualKnowledge,
  updateIntelligenceStatus,
  deleteIntelligence,
  processKnowledgeUrl,
} from '@/services/intelligence'

export default function NABHub() {
  const [intelligences, setIntelligences] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('Sincronizando Inteligência...')
  const [isFetching, setIsFetching] = useState(true)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [content, setContent] = useState('')
  const { toast } = useToast()

  const fetchIntelligences = async () => {
    setIsFetching(true)
    try {
      const data = await getIntelligences()
      setIntelligences(data || [])
    } catch (error) {
      console.error(error)
    } finally {
      setIsFetching(false)
    }
  }

  useEffect(() => {
    fetchIntelligences()
  }, [])

  const handleIngest = async () => {
    if (!title.trim() && !url.trim()) {
      toast({
        title: 'Aviso',
        description: 'O título ou URL são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    if (!url.trim() && !content.trim()) {
      toast({
        title: 'Aviso',
        description: 'Forneça uma URL ou conteúdo manual.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    const hasUrl = !!url.trim()
    setLoadingMessage(
      hasUrl ? 'A IA está lendo o conteúdo da feira...' : 'Sincronizando Inteligência...',
    )

    try {
      const record = await ingestManualKnowledge({
        title: title.trim() || 'Processando URL...',
        source_url: url || undefined,
        raw_content: content || undefined,
        status: 'draft',
      })

      if (hasUrl) {
        await processKnowledgeUrl({ url, manufacturer_id: undefined, record_id: record.id })
      }

      toast({
        title: 'Sucesso',
        description: 'Cérebro da IA atualizado com sucesso!',
      })

      setTitle('')
      setUrl('')
      setContent('')
      fetchIntelligences()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao salvar informações técnicas',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published'
    try {
      await updateIntelligenceStatus(id, newStatus)
      fetchIntelligences()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar status',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteIntelligence(id)
      fetchIntelligences()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao deletar registro',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">NAB Intelligence Hub</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie o conhecimento de IA sobre atualizações de mercado e lançamentos.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-xl">Nova Ingestão de Conhecimento</CardTitle>
            <CardDescription>Adicione novas fontes ou notas manuais para a IA.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Título do Evento / Lançamento</label>
              <Input
                placeholder="Ex: Lançamento NAB 2026 - Nova Câmera XYZ"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-muted-foreground" /> URL da Fonte
              </label>
              <Input
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" /> Conteúdo ou Notas Manuais
              </label>
              <Textarea
                placeholder="Insira as especificações técnicas, novidades e informações detalhadas..."
                className="min-h-[180px] bg-background resize-y"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            <Button
              onClick={handleIngest}
              disabled={isLoading}
              className="w-full mt-4 h-12 text-md font-semibold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {loadingMessage}
                </>
              ) : (
                'Alimentar Cérebro da IA'
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-muted shadow-md">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="text-xl">Knowledge Feed</CardTitle>
            <CardDescription>Gerencie as informações já integradas.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isFetching ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : intelligences.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma inteligência coletada ainda.
              </div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {intelligences.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/10 transition-colors"
                  >
                    <div className="space-y-1.5 overflow-hidden pr-4 flex-1">
                      <p className="font-semibold text-sm truncate" title={item.title}>
                        {item.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-medium ${item.status === 'published' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20'}`}
                        >
                          {item.status === 'published' ? 'Publicado' : 'Rascunho'}
                        </span>
                        {item.source_url && (
                          <a
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate max-w-[200px] hover:underline hover:text-primary transition-colors"
                          >
                            {item.source_url}
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Switch
                        checked={item.status === 'published'}
                        onCheckedChange={() => handleToggleStatus(item.id, item.status)}
                        title={item.status === 'published' ? 'Despublicar' : 'Publicar'}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
