import { useEffect, useState } from "react"
import { useInterval } from "@/lib/hooks"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { logsApi } from "@/lib/api"
import { PlayIcon, PauseIcon, SquareIcon } from "lucide-react"

type MonitoringState = "stopped" | "running" | "paused";

export default function Monitor() {
  const [logs, setLogs] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [monitoringState, setMonitoringState] = useState<MonitoringState>("stopped");

  const fetchLogs = async () => {
    try {
      const response = await logsApi.getRecentLogs();
      setLogs(response.data);
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };

  const toggleMonitoring = async (newState: MonitoringState) => {
    try {
      switch (newState) {
        case "running":
          await logsApi.startMonitoring();
          break;
        case "paused":
          await logsApi.pauseMonitoring();
          break;
        case "stopped":
          await logsApi.stopMonitoring();
          break;
      }
      setMonitoringState(newState);
    } catch (error) {
      console.error("Error toggling monitoring:", error);
    }
  };

  useInterval(fetchLogs, monitoringState === "running" ? 1000 : null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = filter
    ? logs.filter(log => log.toLowerCase().includes(filter.toLowerCase()))
    : logs;

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Log Monitor</CardTitle>
          <CardDescription>
            Monitor and analyze log files in real-time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Button
                variant={monitoringState === "running" ? "secondary" : "default"}
                onClick={() => toggleMonitoring("running")}
              >
                <PlayIcon className="h-4 w-4 mr-2" />
                Start
              </Button>
              <Button
                variant={monitoringState === "paused" ? "secondary" : "default"}
                onClick={() => toggleMonitoring("paused")}
              >
                <PauseIcon className="h-4 w-4 mr-2" />
                Pause
              </Button>
              <Button
                variant={monitoringState === "stopped" ? "secondary" : "default"}
                onClick={() => toggleMonitoring("stopped")}
              >
                <SquareIcon className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="filter">Filter Logs</Label>
              <Input
                id="filter"
                placeholder="Enter filter text..."
                value={filter}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilter(e.target.value)}
              />
            </div>
            <Separator />
            <div className="h-[400px] overflow-auto rounded-md border bg-muted p-4">
              <pre className="font-mono text-sm">
                {filteredLogs.map((log, index) => (
                  <div key={index} className="whitespace-pre-wrap">
                    {log}
                  </div>
                ))}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
