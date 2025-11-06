"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { User, Send } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface AssignTaskDialogProps {
  taskId: string
  taskTitle: string
  currentAssigneeId?: string | null
  currentAssigneeName?: string | null
  onTaskAssigned?: () => void
  triggerButton?: React.ReactNode
}

export function AssignTaskDialog({
  taskId,
  taskTitle,
  currentAssigneeId,
  currentAssigneeName,
  onTaskAssigned,
  triggerButton,
}: AssignTaskDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")

  useEffect(() => {
    if (open) {
      fetchUsers()
      setSelectedUserId("")
    }
  }, [open])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את רשימת המשתמשים",
        variant: "destructive",
      })
    }
  }

  const handleAssign = async () => {
    if (!selectedUserId) {
      toast({
        title: "שגיאה",
        description: "אנא בחר משתמש",
        variant: "destructive",
      })
      return
    }

    if (selectedUserId === currentAssigneeId) {
      toast({
        title: "שגיאה",
        description: "המשימה כבר מוקצית למשתמש הזה",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: taskId,
          assigneeId: selectedUserId,
        }),
      })

      if (response.ok) {
        const selectedUser = users.find((u) => u.id === selectedUserId)
        toast({
          title: "המשימה הועברה בהצלחה!",
          description: `המשימה "${taskTitle}" הועברה ל-${selectedUser?.name || "משתמש"}`,
        })
        setOpen(false)
        onTaskAssigned?.()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן להעביר את המשימה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error assigning task:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהעברת המשימה",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline" size="sm">
            <Send className="w-4 h-4 ml-2" />
            העבר
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>העבר משימה</DialogTitle>
          <DialogDescription>
            בחר משתמש להעברת המשימה: {taskTitle}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="assignee">העבר ל-</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger id="assignee">
                <SelectValue placeholder="בחר משתמש" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem
                    key={user.id}
                    value={user.id}
                    disabled={user.id === currentAssigneeId}
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{user.name}</span>
                      {user.id === currentAssigneeId && (
                        <span className="text-xs text-gray-500">(נוכחי)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentAssigneeName && (
              <p className="text-xs text-gray-500 mt-1">
                אחראי נוכחי: {currentAssigneeName}
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleAssign}
              disabled={loading || !selectedUserId}
              className="prodify-gradient text-white"
            >
              <Send className="w-4 h-4 ml-2" />
              {loading ? "מעביר..." : "העבר משימה"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

