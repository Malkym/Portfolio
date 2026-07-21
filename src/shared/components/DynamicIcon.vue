<script setup lang="ts">
import type { Component } from 'vue'
import { computed } from 'vue'
import {
  AlertTriangle, Award, BarChart3, Briefcase, Building, Clock, Edit,
  ExternalLink, GraduationCap, Hand, Heart, Hourglass,
  Image, Link, Lock, LogOut, Mail, MapPin, Menu, MessageCircle, Palette,
  Phone, Rocket, Settings, Sparkles, Star, TrendingUp, Wrench, Zap,
} from '@lucide/vue'

const icons: Record<string, Component> = {
  'alert-triangle': AlertTriangle,
  award: Award,
  'bar-chart-3': BarChart3,
  briefcase: Briefcase,
  building: Building,
  clock: Clock,
  edit: Edit,
  'external-link': ExternalLink,
  github: ExternalLink,
  'graduation-cap': GraduationCap,
  handshake: Hand,
  heart: Heart,
  hourglass: Hourglass,
  image: Image,
  link: Link,
  lock: Lock,
  'log-out': LogOut,
  mail: Mail,
  'map-pin': MapPin,
  menu: Menu,
  'message-circle': MessageCircle,
  palette: Palette,
  phone: Phone,
  rocket: Rocket,
  settings: Settings,
  sparkles: Sparkles,
  star: Star,
  'trending-up': TrendingUp,
  wrench: Wrench,
  zap: Zap,
}

const props = defineProps<{ name: string; size?: number }>()
const icon = computed(() => icons[props.name])
</script>

<template>
  <component :is="icon" v-if="icon" :size="size || 20" aria-hidden="true" />
  <span v-else aria-hidden="true">{{ name }}</span>
</template>