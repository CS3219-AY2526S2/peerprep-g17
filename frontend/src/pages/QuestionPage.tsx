import { useState, useEffect} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import { __unstable__loadDesignSystem } from "tailwindcss";

interface QuestionRecord {
  _id: string;
  title: string;
  difficulty: string;
  topic: string;
  description: string;
}

export default function QuestionPage() {
  const { token } = useAuth();
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  
  // CREATE
  async function handleSubmit() {
    try {
      const res = await fetch("http://localhost:8080/api/questions/create", {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
       },
       body: JSON.stringify({title: title, difficulty: difficulty, topic: topic, description: description})
      }); 


      const json = await res.json();
      
      if (!res.ok) {
        setError(json.error || "Failed to fetch questions");
        return;
      }

      fetchQuestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Question add failed");
    } finally {
      setLoading(false);
    }
  }

  // READ
  async function fetchQuestions() {
    try {
      const res = await fetch("http://localhost:8080/api/questions", {
        method: 'GET',
        headers: { 
          Authorization: `Bearer ${token}`
       }
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to fetch questions");
        return;
      }

      setQuestions(json.data);
    } catch {
      setError("Could not connect to Question Service");
    } finally {
      setLoading(false);
    }
  }

  // UPDATE
  async function editQuestion(_id: string) {
    // edit question, to be implemented
  }

  // DELETE
  async function deleteQuestion(_id: string) {
    try {
      const res = await fetch(`http://localhost:8080/api/questions/${_id}`, {
        method: 'DELETE',
        headers: { 
          Authorization: `Bearer ${token}`
       },
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to delete question");
        return;
      }

      fetchQuestions();
      setSuccess("Successfully deleted question");
    } catch {
      setError("Could not connect to Question Service");
    } finally {
      setLoading(false);
    }
  }

  async function populate() {
    // autopopulate with data to help with development purposes, to be implemented
    // maybe can read from json file?
  }

  useEffect(() => {
    fetchQuestions();
  }, [token]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 pt-24">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Question Panel</h1>
            <p className="mt-2 text-muted-foreground">
              Manage all questions
            </p>
          </div>
          <span className="rounded-md bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {questions.length} questions
          </span>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
            {success}
          </div>
        )}

        <h1 className="text-1xl font-bold tracking-tight"><br></br>Add question<br></br></h1>
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              type="text"
              placeholder="Required, must be unique"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty</Label>
            <Input
              id="difficulty"
              type="text"
              placeholder="Easy / Medium / Hard"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              type="text"
              placeholder="Misc / Array / String / Hash Table / Math / Dynamic Programming / Sorting / Greedy / Depth-First Search / Binary Search"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              type="text"
              placeholder="Required"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"          >
            {loading ? "Adding question…" : "Add question"}
          </Button>
        </form>

        {loading ? (
          <p className="mt-12 text-center text-sm text-muted-foreground">
            Loading questions…
          </p>
        ) : (
          <div className="mt-8 overflow-hidden rounded-xl border border-border/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Difficulty
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Topic
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr
                    key={q._id}
                    className="border-b border-border/30 last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 font-medium">{q.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {q.difficulty}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {q.topic}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {q.description}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            editQuestion(q._id)
                          }}
                        >
                          Edit
                        </Button>
                    </td>
                    <td>
                      <Button
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            deleteQuestion(q._id)
                          }}
                        >
                          Delete
                        </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          size="lg"     
          onClick={() => {
           populate()
          }}
        >
          Autopopulate with data (to be implemented)
        </Button>
      </main>
    </div>
  );
}