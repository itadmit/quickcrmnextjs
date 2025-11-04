"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, Users, Video, Phone } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { NewMeetingDialog } from "@/components/dialogs/NewMeetingDialog"

interface Meeting {
  id: number
  title: string
  startTime: string
  endTime: string
  type: "video" | "in-person" | "phone"
  location: string
  attendees: string[]
  date: string
  color: string
}

export default function CalendarPage() {
  const { toast } = useToast()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate())
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMeetings()
  }, [currentDate])

  const fetchMeetings = async () => {
    try {
      const response = await fetch(`/api/calendar?month=${currentDate.getMonth()}&year=${currentDate.getFullYear()}`)
      if (response.ok) {
        const data = await response.json()
        setMeetings(data)
      }
    } catch (error) {
      console.error('Error fetching meetings:', error)
    } finally {
      setLoading(false)
    }
  }

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()
  const today = new Date().getDate()

  const days = ["א", "ב", "ג", "ד", "ה", "ו", "ש"]
  const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"]
  const monthName = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
  
  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      purple: "bg-purple-100 border-purple-300 text-purple-700",
      blue: "bg-blue-100 border-blue-300 text-blue-700",
      green: "bg-green-100 border-green-300 text-green-700",
      orange: "bg-orange-100 border-orange-300 text-orange-700",
      red: "bg-red-100 border-red-300 text-red-700",
    }
    return colors[color] || "bg-gray-100 border-gray-300 text-gray-700"
  }

  const getMeetingsForDay = (day: number) => {
    return meetings.filter(m => {
      const meetingDate = new Date(m.date)
      return meetingDate.getDate() === day && 
             meetingDate.getMonth() === currentDate.getMonth() &&
             meetingDate.getFullYear() === currentDate.getFullYear()
    })
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date(2024, 6, 7))
    setSelectedDay(7)
    toast({
      title: "חזרה להיום",
      description: "הלוח שנה הוחזר לתאריך של היום",
    })
  }

  const handleDayClick = (day: number) => {
    setSelectedDay(day)
    const dayMeetings = meetings.filter(m => m.date === day)
    if (dayMeetings.length > 0) {
      toast({
        title: `${day} ביולי`,
        description: `יש לך ${dayMeetings.length} פגישות ביום זה`,
      })
    } else {
      toast({
        title: `${day} ביולי`,
        description: "אין פגישות ביום זה",
      })
    }
  }

  const handleMeetingClick = (meeting: Meeting) => {
    toast({
      title: meeting.title,
      description: `${meeting.startTime} - ${meeting.endTime} • ${meeting.location}`,
    })
  }

  const selectedDayMeetings = getMeetingsForDay(selectedDay)
  const todayMeetings = getMeetingsForDay(today)
  const upcomingMeetings = meetings.filter(m => {
    const meetingDate = new Date(m.date)
    return meetingDate > new Date()
  }).slice(0, 3)

  const getMeetingIcon = (type: Meeting['type']) => {
    switch (type) {
      case 'video':
        return <Video className="w-3 h-3" />
      case 'phone':
        return <Phone className="w-3 h-3" />
      case 'in-person':
        return <MapPin className="w-3 h-3" />
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">לוח שנה</h1>
            <p className="text-gray-500 mt-1">נהל את הפגישות והאירועים שלך</p>
          </div>
          <NewMeetingDialog onMeetingCreated={() => {
            // Refresh meetings list if needed
            toast({
              title: "הפגישה נשמרה",
              description: "הפגישה נוספה ללוח השנה",
            })
          }} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{monthName}</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={previousMonth}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToToday}>
                      היום
                    </Button>
                    <Button variant="outline" size="sm" onClick={nextMonth}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Days header */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {days.map((day, idx) => (
                    <div key={idx} className="text-center text-sm font-medium text-gray-600 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-2">
                  {/* Empty cells before month starts */}
                  {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="aspect-square"></div>
                  ))}

                  {/* Days of month */}
                  {Array.from({ length: daysInMonth }).map((_, idx) => {
                    const day = idx + 1
                    const isToday = day === today && currentDate.getMonth() === new Date().getMonth()
                    const isSelected = day === selectedDay
                    const hasMeetings = getMeetingsForDay(day).length > 0

                    return (
                      <button
                        key={day}
                        onClick={() => handleDayClick(day)}
                        className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all relative ${
                          isToday
                            ? "bg-purple-600 text-white font-bold shadow-lg scale-110"
                            : isSelected
                            ? "bg-purple-100 text-purple-900 font-semibold ring-2 ring-purple-600"
                            : hasMeetings
                            ? "bg-blue-50 hover:bg-blue-100 text-gray-900 hover:scale-105"
                            : "hover:bg-gray-100 text-gray-700 hover:scale-105"
                        }`}
                      >
                        <span>{day}</span>
                        {hasMeetings && !isToday && (
                          <div className="flex gap-0.5 mt-1">
                            {getMeetingsForDay(day)
                              .slice(0, 3)
                              .map((_, i) => (
                                <div 
                                  key={i} 
                                  className={`w-1 h-1 rounded-full ${
                                    isSelected ? 'bg-purple-600' : 'bg-blue-600'
                                  }`}
                                ></div>
                              ))}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Selected day meetings */}
                {selectedDayMeetings.length > 0 && selectedDay !== today && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-semibold text-lg mb-4">
                      פגישות ב-{selectedDay} ב{monthNames[currentDate.getMonth()]} • {selectedDayMeetings.length} פגישות
                    </h3>
                    <div className="space-y-3">
                      {selectedDayMeetings.map((meeting) => (
                        <div
                          key={meeting.id}
                          onClick={() => handleMeetingClick(meeting)}
                          className={`p-3 rounded-lg border-2 cursor-pointer hover:shadow-md transition-shadow ${getColorClasses(meeting.color)}`}
                        >
                          <h4 className="font-medium mb-1">{meeting.title}</h4>
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{meeting.startTime} - {meeting.endTime}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {getMeetingIcon(meeting.type)}
                              <span>{meeting.location}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              <span>{meeting.attendees.join(", ")}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Meetings */}
          <div className="space-y-6">
            {/* Today's Meetings */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>היום • {todayMeetings.length} פגישות</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {todayMeetings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">אין פגישות היום</p>
                  </div>
                ) : (
                  todayMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      onClick={() => handleMeetingClick(meeting)}
                      className={`p-3 rounded-lg border-2 cursor-pointer hover:shadow-md transition-shadow ${getColorClasses(meeting.color)}`}
                    >
                      <h4 className="font-medium mb-1">{meeting.title}</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{meeting.startTime} - {meeting.endTime}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {getMeetingIcon(meeting.type)}
                          <span>{meeting.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{meeting.attendees.join(", ")}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Upcoming */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>קרוב</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingMeetings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">אין פגישות קרובות</p>
                  </div>
                ) : (
                  upcomingMeetings.map((meeting) => (
                    <div 
                      key={meeting.id} 
                      onClick={() => handleMeetingClick(meeting)}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{meeting.title}</h4>
                        <span className="text-xs text-gray-500">
                          {new Date(meeting.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{meeting.startTime} - {meeting.endTime}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {getMeetingIcon(meeting.type)}
                          <span>{meeting.location}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
