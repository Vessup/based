"use client"

import { Calendar, Database, Home, Inbox, Search, Settings, Table } from "lucide-react"
import { useEffect, useState } from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { fetchDatabaseTables } from "@/lib/actions"

// Menu items.
const items = [
  {
    title: "Home",
    url: "#",
    icon: Home,
  },
  {
    title: "Inbox",
    url: "#",
    icon: Inbox,
  },
  {
    title: "Calendar",
    url: "#",
    icon: Calendar,
  },
  {
    title: "Search",
    url: "#",
    icon: Search,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
  },
]

export function AppSidebar() {
  const [tables, setTables] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTables() {
      try {
        const result = await fetchDatabaseTables()

        if (result.error) {
          setError(result.error)
        } else {
          setTables(result.tables)
        }
      } catch (err) {
        console.error("Failed to fetch database tables:", err)
        setError("Failed to load database tables")
      } finally {
        setLoading(false)
      }
    }

    loadTables()
  }, [])

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            <Database className="mr-2 h-4 w-4" />
            Database Tables
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {loading ? (
                <SidebarMenuItem>
                  <SidebarMenuButton disabled>
                    <span>Loading tables...</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : error ? (
                <SidebarMenuItem>
                  <SidebarMenuButton disabled>
                    <span>{error}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : tables.length === 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton disabled>
                    <span>No tables found</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                tables.map((tableName) => (
                  <SidebarMenuItem key={tableName}>
                    <SidebarMenuButton asChild>
                      <a href={`/tables/${tableName}`}>
                        <Table className="h-4 w-4" />
                        <span>{tableName}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
