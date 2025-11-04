"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Filter, FolderKanban } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { TableSkeleton } from "@/components/skeletons/TableSkeleton"
import { NewProjectDialog } from "@/components/dialogs/NewProjectDialog"

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  startDate: string | null
  endDate: string | null
  budget: number | null
  client: { name: string } | null
  tasks: Array<{ id: string; title: string; status: string }>
  _count: { tasks: number }
  createdAt: string
}

export default function ProjectsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן לטעון את הפרויקטים",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת הפרויקטים",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.client?.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const statusColors: Record<string, string> = {
    PLANNING: "bg-gray-100 text-gray-800",
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    ON_HOLD: "bg-yellow-100 text-yellow-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
  }

  const statusLabels: Record<string, string> = {
    PLANNING: "תכנון",
    IN_PROGRESS: "בביצוע",
    ON_HOLD: "בהמתנה",
    COMPLETED: "הושלם",
    CANCELLED: "בוטל",
  }

  const getProjectProgress = (project: Project) => {
    if (project.tasks.length === 0) return 0
    const completedTasks = project.tasks.filter(t => t.status === 'DONE').length
    return Math.round((completedTasks / project.tasks.length) * 100)
  }

  const activeProjects = projects.filter(p => p.status === 'IN_PROGRESS').length
  const completedProjects = projects.filter(p => p.status === 'COMPLETED').length

  if (loading) {
    return (
      <AppLayout>
        <TableSkeleton rows={5} columns={6} />
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">פרויקטים</h1>
            <p className="text-gray-500 mt-1">נהל את כל הפרויקטים שלך במקום אחד</p>
          </div>
          <NewProjectDialog onProjectCreated={fetchProjects} />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">סה״כ פרויקטים</CardTitle>
              <FolderKanban className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">פעילים</CardTitle>
              <FolderKanban className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeProjects}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">הושלמו</CardTitle>
              <FolderKanban className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedProjects}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="חיפוש לפי שם פרויקט או לקוח..."
                  className="pr-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline">
                <Filter className="w-4 h-4 ml-2" />
                סינון
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <FolderKanban className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? "לא נמצאו פרויקטים" : "אין פרויקטים עדיין"}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm
                  ? "נסה לחפש במונח אחר"
                  : "התחל על ידי יצירת פרויקט חדש"}
              </p>
              {!searchTerm && (
                <NewProjectDialog onProjectCreated={fetchProjects} />
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => {
              const progress = getProjectProgress(project)
              const completedTasks = project.tasks.filter(t => t.status === 'DONE').length

              return (
                <Card 
                  key={project.id} 
                  className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/clients/${project.client}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                          {project.client?.name || "ללא לקוח"}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${statusColors[project.status]}`}>
                        {statusLabels[project.status]}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Progress */}
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-600">התקדמות</span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Tasks */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">משימות</span>
                        <span className="font-medium">
                          {completedTasks} / {project._count.tasks}
                        </span>
                      </div>

                      {/* Budget */}
                      {project.budget && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">תקציב</span>
                          <span className="font-medium">
                            ₪{(project.budget / 1000).toFixed(0)}K
                          </span>
                        </div>
                      )}

                      {/* Dates */}
                      {project.startDate && project.endDate && (
                        <div className="text-xs text-gray-500 pt-2 border-t">
                          {new Date(project.startDate).toLocaleDateString('he-IL')} - {new Date(project.endDate).toLocaleDateString('he-IL')}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
