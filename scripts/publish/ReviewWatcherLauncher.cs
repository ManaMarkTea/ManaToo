using System;
using System.Diagnostics;
using System.IO;

// Built as a Windows application (not a console application). Neither this
// launcher nor its Node child allocates a console window.
internal static class ReviewWatcherLauncher
{
    [STAThread]
    private static int Main(string[] args)
    {
        if (args.Length != 2) return 2;
        string log = null;
        try
        {
            string script = Path.GetFullPath(args[1]);
            string root = Path.GetFullPath(Path.Combine(Path.GetDirectoryName(script), "../.."));
            string folder = Path.Combine(root, "exports", "review-watch");
            Directory.CreateDirectory(folder);
            log = Path.Combine(folder, "launcher.log");
            var start = new ProcessStartInfo
            {
                FileName = Path.GetFullPath(args[0]),
                Arguments = "\"" + script + "\"",
                WorkingDirectory = root,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };
            using (var child = Process.Start(start))
            {
                var output = child.StandardOutput.ReadToEndAsync();
                var error = child.StandardError.ReadToEndAsync();
                if (!child.WaitForExit(150000))
                {
                    child.Kill();
                    File.AppendAllText(log, DateTimeOffset.UtcNow.ToString("o") + ": watcher timed out\n");
                    return 124;
                }
                File.AppendAllText(log, DateTimeOffset.UtcNow.ToString("o") + ": exit=" + child.ExitCode + "\n" + output.Result + error.Result);
                return child.ExitCode;
            }
        }
        catch (Exception error)
        {
            if (log != null) File.AppendAllText(log, DateTimeOffset.UtcNow.ToString("o") + ": " + error.Message + "\n");
            return 1;
        }
    }
}
