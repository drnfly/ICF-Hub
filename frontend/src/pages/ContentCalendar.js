import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Plus, Clock, Trash2, Send, Loader2,
  Facebook, Linkedin, Twitter, Instagram, Video, Eye
} from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLATFORM_ICONS = {
  facebook: Facebook, instagram: Instagram, linkedin: Linkedin,
  x: Twitter, tiktok: Video
};
const PLATFORM_COLORS = {
  facebook: "bg-blue-100 text-blue-700 border-blue-200",
  instagram: "bg-pink-100 text-pink-700 border-pink-200",
  linkedin: "bg-sky-100 text-sky-700 border-sky-200",
  x: "bg-gray-100 text-gray-700 border-gray-200",
  tiktok: "bg-violet-100 text-violet-700 border-violet-200"
};

export default function ContentCalendar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("icf_token");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [selectedPost, setSelectedPost] = useState(null);
  const [publishing, setPublishing] = useState(null);

  useEffect(() => {
    if (!token) { navigate("/auth"); return; }
    fetchPosts();
  }, [token, navigate]);

  const fetchPosts = async () => {
    try {
      const { data } = await axios.get(`${API}/schedule`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(data);
    } catch {} finally { setLoading(false); }
  };

  const deletePost = async (id) => {
    try {
      await axios.delete(`${API}/schedule/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(prev => prev.filter(p => p.id !== id));
      if (selectedPost?.id === id) setSelectedPost(null);
      toast.success("Post removed from schedule");
    } catch { toast.error("Failed to delete"); }
  };

  const publishPost = async (id) => {
    setPublishing(id);
    try {
      const { data } = await axios.post(`${API}/schedule/${id}/publish`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(prev => prev.map(p => p.id === id ? data : p));
      toast.success("Post published!");
    } catch { toast.error("Failed to publish"); }
    finally { setPublishing(null); }
  };

  // Calendar logic
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const filteredPosts = useMemo(() => {
    return posts.filter(p => filterPlatform === "all" || p.platform === filterPlatform);
  }, [posts, filterPlatform]);

  const getPostsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return filteredPosts.filter(p => p.scheduled_date === dateStr);
  };

  const today = new Date();
  const isToday = (day) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const calendarDays = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const stats = {
    total: posts.length,
    scheduled: posts.filter(p => p.status === "scheduled").length,
    published: posts.filter(p => p.status === "published").length,
    thisMonth: posts.filter(p => {
      const d = p.scheduled_date;
      return d && d.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`);
    }).length
  };

  if (loading) return <div className="pt-16 min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="pt-16 min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <span className="mono-label mb-1 block">SCHEDULER</span>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              Content <span className="text-primary">Calendar</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Schedule, manage, and publish your social media content</p>
          </div>
          <Button data-testid="calendar-create-content-btn" onClick={() => navigate("/content")} className="rounded-sm text-xs tracking-widest font-bold uppercase hard-shadow">
            <Plus className="w-4 h-4 mr-2" /> CREATE CONTENT
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "TOTAL POSTS", val: stats.total },
            { label: "SCHEDULED", val: stats.scheduled },
            { label: "PUBLISHED", val: stats.published },
            { label: "THIS MONTH", val: stats.thisMonth },
          ].map((s, i) => (
            <div key={i} data-testid={`calendar-stat-${i}`} className="bg-card border border-border rounded-sm p-3">
              <div className="mono-label text-[9px] mb-0.5">{s.label}</div>
              <div className="stat-value text-xl text-primary">{s.val}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Calendar */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-card border border-border rounded-sm overflow-hidden">
              {/* Calendar header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <button data-testid="calendar-prev-btn" onClick={prevMonth} className="p-1.5 hover:bg-muted rounded-sm"><ChevronLeft className="w-4 h-4" /></button>
                  <h2 className="text-base font-bold min-w-[180px] text-center" style={{ fontFamily: "'Clash Display', sans-serif" }}>{monthName}</h2>
                  <button data-testid="calendar-next-btn" onClick={nextMonth} className="p-1.5 hover:bg-muted rounded-sm"><ChevronRight className="w-4 h-4" /></button>
                  <Button variant="outline" size="sm" onClick={goToday} className="rounded-sm text-[10px] tracking-widest uppercase ml-2">TODAY</Button>
                </div>
                <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                  <SelectTrigger data-testid="calendar-filter-platform" className="w-36 rounded-sm text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="x">X / Twitter</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-border">
                {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(d => (
                  <div key={d} className="p-2 text-center mono-label text-[9px] text-muted-foreground">{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, i) => {
                  const dayPosts = day ? getPostsForDay(day) : [];
                  return (
                    <div
                      key={i}
                      className={`min-h-[100px] border-b border-r border-border p-1.5 ${
                        !day ? "bg-muted/20" : isToday(day) ? "bg-primary/5" : "bg-card"
                      } ${day ? "cursor-pointer hover:bg-muted/30" : ""}`}
                      data-testid={day ? `calendar-day-${day}` : undefined}
                    >
                      {day && (
                        <>
                          <div className={`text-xs font-medium mb-1 ${isToday(day) ? "text-primary font-bold" : "text-muted-foreground"}`}>{day}</div>
                          <div className="space-y-0.5">
                            {dayPosts.slice(0, 3).map(post => {
                              const Icon = PLATFORM_ICONS[post.platform] || Clock;
                              return (
                                <button
                                  key={post.id}
                                  onClick={() => setSelectedPost(post)}
                                  className={`w-full text-left px-1.5 py-0.5 rounded-sm text-[10px] flex items-center gap-1 truncate border ${
                                    post.status === "published" ? "bg-green-50 text-green-700 border-green-200" : PLATFORM_COLORS[post.platform] || "bg-muted"
                                  }`}
                                >
                                  <Icon className="w-2.5 h-2.5 flex-shrink-0" />
                                  <span className="truncate">{post.content?.slice(0, 25)}</span>
                                </button>
                              );
                            })}
                            {dayPosts.length > 3 && (
                              <span className="text-[9px] text-muted-foreground pl-1">+{dayPosts.length - 3} more</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar - Selected post or upcoming */}
          <div className="col-span-12 lg:col-span-4">
            {selectedPost ? (
              <div className="bg-card border border-border rounded-sm p-5 sticky top-24 relative tech-corner">
                <div className="flex items-center justify-between mb-4">
                  <Badge className={`text-[10px] tracking-wider uppercase rounded-sm border ${PLATFORM_COLORS[selectedPost.platform] || "bg-muted"}`}>
                    {selectedPost.platform}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] tracking-wider uppercase rounded-sm ${selectedPost.status === "published" ? "text-green-600 border-green-300" : ""}`}>
                    {selectedPost.status}
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed mb-3 whitespace-pre-wrap">{selectedPost.content}</p>
                {selectedPost.hashtags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {selectedPost.hashtags.map((tag, j) => (
                      <span key={j} className="text-[10px] text-primary">{tag.startsWith("#") ? tag : `#${tag}`}</span>
                    ))}
                  </div>
                )}
                {selectedPost.cta && <p className="text-xs text-primary font-semibold mb-3">CTA: {selectedPost.cta}</p>}
                <div className="mono-label text-[9px] mb-4">
                  {selectedPost.scheduled_date} at {selectedPost.scheduled_time}
                </div>
                <div className="flex gap-2">
                  {selectedPost.status === "scheduled" && (
                    <Button
                      data-testid="calendar-publish-btn"
                      onClick={() => publishPost(selectedPost.id)}
                      disabled={publishing === selectedPost.id}
                      size="sm"
                      className="flex-1 rounded-sm text-xs tracking-widest font-bold uppercase"
                    >
                      {publishing === selectedPost.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                      PUBLISH
                    </Button>
                  )}
                  <Button
                    data-testid="calendar-delete-btn"
                    variant="outline"
                    size="sm"
                    onClick={() => deletePost(selectedPost.id)}
                    className="rounded-sm"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-sm p-5 sticky top-24">
                <h3 className="text-sm font-bold tracking-widest uppercase mb-4" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                  Upcoming Posts
                </h3>
                {posts.filter(p => p.status === "scheduled").slice(0, 6).length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-xs text-muted-foreground mb-3">No scheduled posts yet.</p>
                    <Button size="sm" onClick={() => navigate("/content")} className="rounded-sm text-[10px] tracking-widest uppercase">
                      CREATE CONTENT
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {posts.filter(p => p.status === "scheduled").slice(0, 6).map(post => {
                      const Icon = PLATFORM_ICONS[post.platform] || Clock;
                      return (
                        <button
                          key={post.id}
                          onClick={() => setSelectedPost(post)}
                          className="w-full text-left p-3 bg-muted/30 hover:bg-muted/50 rounded-sm transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="w-3 h-3 text-primary" />
                            <span className="mono-label text-[9px]">{post.scheduled_date}</span>
                            <span className="mono-label text-[9px]">{post.scheduled_time}</span>
                          </div>
                          <p className="text-xs truncate">{post.content?.slice(0, 60)}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
