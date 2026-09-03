export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      event_invites: {
        Row: {
          created_at: string
          event_id: string
          id: string
          invitee_id: string
          inviter_id: string
          responded_at: string | null
          role: string
          status: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          invitee_id: string
          inviter_id: string
          responded_at?: string | null
          role?: string
          status?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          invitee_id?: string
          inviter_id?: string
          responded_at?: string | null
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_members: {
        Row: {
          can_invite: boolean
          can_shuffle: boolean
          event_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          can_invite?: boolean
          can_shuffle?: boolean
          event_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          can_invite?: boolean
          can_shuffle?: boolean
          event_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          duration_min: number
          everyone_can_shuffle: boolean
          id: string
          players_per_team: number
          reminded_at: string | null
          starts_at: string
          status: string
          team_count: number
          title: string
          updated_at: string
          venue: string | null
          visibility: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          duration_min?: number
          everyone_can_shuffle?: boolean
          id?: string
          players_per_team?: number
          reminded_at?: string | null
          starts_at: string
          status?: string
          team_count?: number
          title: string
          updated_at?: string
          venue?: string | null
          visibility?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          duration_min?: number
          everyone_can_shuffle?: boolean
          id?: string
          players_per_team?: number
          reminded_at?: string | null
          starts_at?: string
          status?: string
          team_count?: number
          title?: string
          updated_at?: string
          venue?: string | null
          visibility?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          blocked_by: string | null
          created_at: string
          id: string
          requested_by: string
          status: string
          updated_at: string
          user_high: string
          user_low: string
        }
        Insert: {
          blocked_by?: string | null
          created_at?: string
          id?: string
          requested_by: string
          status?: string
          updated_at?: string
          user_high: string
          user_low: string
        }
        Update: {
          blocked_by?: string | null
          created_at?: string
          id?: string
          requested_by?: string
          status?: string
          updated_at?: string
          user_high?: string
          user_low?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          data: Json
          event_id: string | null
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          data?: Json
          event_id?: string | null
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          data?: Json
          event_id?: string | null
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_seen_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_seen_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_seen_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      shuffle_state: {
        Row: {
          active_editor_id: string | null
          editor_expires_at: string | null
          event_id: string
          updated_at: string
          version: number
        }
        Insert: {
          active_editor_id?: string | null
          editor_expires_at?: string | null
          event_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          active_editor_id?: string | null
          editor_expires_at?: string | null
          event_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "shuffle_state_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      team_assignments: {
        Row: {
          event_id: string
          id: string
          slot: number | null
          team_index: number | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          slot?: number | null
          team_index?: number | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          slot?: number | null
          team_index?: number | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_event_member: {
        Args: { _event: string; _role?: string; _user: string }
        Returns: {
          can_invite: boolean
          can_shuffle: boolean
          event_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "event_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      are_friends: { Args: { _a: string; _b: string }; Returns: boolean }
      auto_shuffle: {
        Args: { _base_version?: number; _event: string }
        Returns: number
      }
      can_invite_to_event: {
        Args: { _event: string; _user?: string }
        Returns: boolean
      }
      can_shuffle_event: {
        Args: { _event: string; _user?: string }
        Returns: boolean
      }
      can_view_event: {
        Args: { _event: string; _user?: string }
        Returns: boolean
      }
      claim_shuffle_editor: {
        Args: { _event: string }
        Returns: {
          active_editor_id: string
          editor_expires_at: string
          ok: boolean
          version: number
        }[]
      }
      commit_shuffle: {
        Args: { _base_version?: number; _event: string; _moves: Json }
        Returns: number
      }
      delete_push_subscription: {
        Args: { _endpoint: string }
        Returns: undefined
      }
      has_pending_invite: {
        Args: { _event: string; _user?: string }
        Returns: boolean
      }
      heartbeat_shuffle_editor: { Args: { _event: string }; Returns: undefined }
      invite_to_event: {
        Args: { _event: string; _invitee: string; _role?: string }
        Returns: {
          created_at: string
          event_id: string
          id: string
          invitee_id: string
          inviter_id: string
          responded_at: string | null
          role: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "event_invites"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_event_admin: {
        Args: { _event: string; _user?: string }
        Returns: boolean
      }
      is_event_member: {
        Args: { _event: string; _user?: string }
        Returns: boolean
      }
      mark_notifications_read: { Args: { _ids?: string[] }; Returns: undefined }
      release_shuffle_editor: { Args: { _event: string }; Returns: undefined }
      remove_event_member: {
        Args: { _event: string; _user: string }
        Returns: undefined
      }
      respond_event_invite: {
        Args: { _accept: boolean; _invite: string }
        Returns: {
          created_at: string
          event_id: string
          id: string
          invitee_id: string
          inviter_id: string
          responded_at: string | null
          role: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "event_invites"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      respond_friend_request: {
        Args: { _accept: boolean; _friendship: string }
        Returns: {
          blocked_by: string | null
          created_at: string
          id: string
          requested_by: string
          status: string
          updated_at: string
          user_high: string
          user_low: string
        }
        SetofOptions: {
          from: "*"
          to: "friendships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      revoke_event_invite: { Args: { _invite: string }; Returns: undefined }
      save_push_subscription: {
        Args: {
          _auth: string
          _endpoint: string
          _p256dh: string
          _user_agent?: string
        }
        Returns: undefined
      }
      send_due_event_reminders: { Args: { _within?: string }; Returns: number }
      send_friend_request: {
        Args: { _to: string }
        Returns: {
          blocked_by: string | null
          created_at: string
          id: string
          requested_by: string
          status: string
          updated_at: string
          user_high: string
          user_low: string
        }
        SetofOptions: {
          from: "*"
          to: "friendships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_friendship_block: {
        Args: { _block: boolean; _other: string }
        Returns: undefined
      }
      update_event_member: {
        Args: {
          _can_invite?: boolean
          _can_shuffle?: boolean
          _event: string
          _role?: string
          _user: string
        }
        Returns: {
          can_invite: boolean
          can_shuffle: boolean
          event_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "event_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

