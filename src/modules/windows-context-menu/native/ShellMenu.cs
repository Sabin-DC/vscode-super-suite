// Shows the native Windows Explorer context menu for one or more files/folders
// (all must share the same parent folder) at the current mouse position.
// Usage: ShellMenu.exe [--extended] <path> [<path> ...]
// Compiled on demand by the extension with the .NET Framework csc.exe that ships with Windows.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

[ComImport, Guid("000214E6-0000-0000-C000-000000000046"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IShellFolder
{
    [PreserveSig] int ParseDisplayName(IntPtr hwnd, IntPtr pbc, [MarshalAs(UnmanagedType.LPWStr)] string name, out uint chEaten, out IntPtr pidl, ref uint attrs);
    [PreserveSig] int EnumObjects(IntPtr hwnd, int flags, out IntPtr enumIDList);
    [PreserveSig] int BindToObject(IntPtr pidl, IntPtr pbc, ref Guid riid, out IntPtr ppv);
    [PreserveSig] int BindToStorage(IntPtr pidl, IntPtr pbc, ref Guid riid, out IntPtr ppv);
    [PreserveSig] int CompareIDs(IntPtr lParam, IntPtr pidl1, IntPtr pidl2);
    [PreserveSig] int CreateViewObject(IntPtr hwndOwner, ref Guid riid, out IntPtr ppv);
    [PreserveSig] int GetAttributesOf(uint cidl, [MarshalAs(UnmanagedType.LPArray)] IntPtr[] apidl, ref uint attrs);
    [PreserveSig] int GetUIObjectOf(IntPtr hwndOwner, uint cidl, [MarshalAs(UnmanagedType.LPArray)] IntPtr[] apidl, ref Guid riid, IntPtr reserved, out IntPtr ppv);
    [PreserveSig] int GetDisplayNameOf(IntPtr pidl, uint flags, IntPtr name);
    [PreserveSig] int SetNameOf(IntPtr hwnd, IntPtr pidl, [MarshalAs(UnmanagedType.LPWStr)] string name, uint flags, out IntPtr pidlOut);
}

[ComImport, Guid("000214E4-0000-0000-C000-000000000046"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IContextMenu
{
    [PreserveSig] int QueryContextMenu(IntPtr hmenu, uint indexMenu, uint idCmdFirst, uint idCmdLast, uint flags);
    [PreserveSig] int InvokeCommand(ref CMINVOKECOMMANDINFOEX info);
    [PreserveSig] int GetCommandString(UIntPtr idCmd, uint type, IntPtr reserved, IntPtr name, uint cch);
}

[ComImport, Guid("000214F4-0000-0000-C000-000000000046"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IContextMenu2
{
    [PreserveSig] int QueryContextMenu(IntPtr hmenu, uint indexMenu, uint idCmdFirst, uint idCmdLast, uint flags);
    [PreserveSig] int InvokeCommand(ref CMINVOKECOMMANDINFOEX info);
    [PreserveSig] int GetCommandString(UIntPtr idCmd, uint type, IntPtr reserved, IntPtr name, uint cch);
    [PreserveSig] int HandleMenuMsg(uint msg, IntPtr wParam, IntPtr lParam);
}

[ComImport, Guid("BCFCE0A0-EC17-11D0-8D10-00A0C90F2719"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IContextMenu3
{
    [PreserveSig] int QueryContextMenu(IntPtr hmenu, uint indexMenu, uint idCmdFirst, uint idCmdLast, uint flags);
    [PreserveSig] int InvokeCommand(ref CMINVOKECOMMANDINFOEX info);
    [PreserveSig] int GetCommandString(UIntPtr idCmd, uint type, IntPtr reserved, IntPtr name, uint cch);
    [PreserveSig] int HandleMenuMsg(uint msg, IntPtr wParam, IntPtr lParam);
    [PreserveSig] int HandleMenuMsg2(uint msg, IntPtr wParam, IntPtr lParam, out IntPtr result);
}

[StructLayout(LayoutKind.Sequential)]
struct POINT { public int x; public int y; }

[StructLayout(LayoutKind.Sequential)]
struct CMINVOKECOMMANDINFOEX
{
    public uint cbSize;
    public uint fMask;
    public IntPtr hwnd;
    public IntPtr lpVerb;
    public IntPtr lpParameters;
    public IntPtr lpDirectory;
    public int nShow;
    public uint dwHotKey;
    public IntPtr hIcon;
    public IntPtr lpTitle;
    public IntPtr lpVerbW;
    public IntPtr lpParametersW;
    public IntPtr lpDirectoryW;
    public IntPtr lpTitleW;
    public POINT ptInvoke;
}

// Invisible window that owns the menu and forwards owner-draw / submenu messages to the shell handlers.
class MenuOwner : Form
{
    public IContextMenu2 Cm2;
    public IContextMenu3 Cm3;

    public MenuOwner()
    {
        FormBorderStyle = FormBorderStyle.None;
        ShowInTaskbar = false;
        StartPosition = FormStartPosition.Manual;
        Size = new Size(1, 1);
        Opacity = 0;
        TopMost = true;
    }

    protected override void WndProc(ref Message m)
    {
        try
        {
            if (Cm3 != null)
            {
                IntPtr result;
                if (Cm3.HandleMenuMsg2((uint)m.Msg, m.WParam, m.LParam, out result) == 0) { m.Result = result; return; }
            }
            else if (Cm2 != null)
            {
                if (Cm2.HandleMenuMsg((uint)m.Msg, m.WParam, m.LParam) == 0) return;
            }
        }
        catch { }
        base.WndProc(ref m);
    }
}

static class Native
{
    public delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lParam);

    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    public static extern int SHParseDisplayName(string name, IntPtr bc, out IntPtr pidl, uint sfgaoIn, out uint sfgaoOut);
    [DllImport("shell32.dll")]
    public static extern int SHBindToParent(IntPtr pidl, ref Guid riid, out IntPtr ppv, out IntPtr pidlLast);
    [DllImport("ole32.dll")]
    public static extern void CoTaskMemFree(IntPtr p);
    [DllImport("ole32.dll")]
    public static extern int OleFlushClipboard();
    [DllImport("user32.dll")]
    public static extern IntPtr CreatePopupMenu();
    [DllImport("user32.dll")]
    public static extern bool DestroyMenu(IntPtr hmenu);
    [DllImport("user32.dll")]
    public static extern uint TrackPopupMenuEx(IntPtr hmenu, uint flags, int x, int y, IntPtr hwnd, IntPtr tpm);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hwnd);
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc proc, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hwnd);
}

static class Program
{
    const uint CMF_CANRENAME = 0x10;
    const uint CMF_EXTENDEDVERBS = 0x100;
    const uint TPM_RIGHTBUTTON = 0x2;
    const uint TPM_RETURNCMD = 0x100;
    const uint CMIC_MASK_UNICODE = 0x4000;
    const uint CMIC_MASK_PTINVOKE = 0x20000000;
    const uint ID_FIRST = 1;
    const uint ID_LAST = 0x7FFF;

    static Guid IID_IShellFolder = new Guid("000214E6-0000-0000-C000-000000000046");
    static Guid IID_IContextMenu = new Guid("000214E4-0000-0000-C000-000000000046");

    [STAThread]
    static int Main(string[] args)
    {
        bool extended = false;
        var paths = new List<string>();
        foreach (var a in args)
        {
            if (a == "--extended") extended = true;
            else paths.Add(a);
        }
        if (paths.Count == 0) { Console.Error.WriteLine("No paths given."); return 2; }
        try { return Run(paths, extended); }
        catch (Exception e) { Console.Error.WriteLine(e.Message); return 1; }
    }

    static bool HasOtherVisibleWindow(IntPtr ownHwnd)
    {
        bool found = false;
        uint me = (uint)Process.GetCurrentProcess().Id;
        Native.EnumWindows(delegate (IntPtr h, IntPtr l)
        {
            uint pid;
            Native.GetWindowThreadProcessId(h, out pid);
            if (pid == me && h != ownHwnd && Native.IsWindowVisible(h)) { found = true; return false; }
            return true;
        }, IntPtr.Zero);
        return found;
    }

    static int Run(List<string> paths, bool extended)
    {
        var fullPidls = new List<IntPtr>();
        var childPidls = new List<IntPtr>();
        IShellFolder folder = null;
        string parentDir = null;

        foreach (var p in paths)
        {
            string clean = p.Length > 3 ? p.TrimEnd('\\', '/') : p;
            string dir = Path.GetDirectoryName(clean);
            if (dir == null) throw new Exception("Cannot show a menu for a drive root: " + p);
            if (parentDir == null) parentDir = dir;
            else if (!string.Equals(parentDir, dir, StringComparison.OrdinalIgnoreCase)) continue; // different parent: skipped

            IntPtr pidl; uint attrs;
            int hr = Native.SHParseDisplayName(clean, IntPtr.Zero, out pidl, 0, out attrs);
            if (hr != 0 || pidl == IntPtr.Zero) throw new Exception("Path not found: " + p);
            fullPidls.Add(pidl);

            IntPtr ppv, last;
            hr = Native.SHBindToParent(pidl, ref IID_IShellFolder, out ppv, out last);
            if (hr != 0) throw new Exception("SHBindToParent failed for " + p);
            if (folder == null) folder = (IShellFolder)Marshal.GetObjectForIUnknown(ppv);
            Marshal.Release(ppv);
            childPidls.Add(last); // points inside pidl; freed with pidl
        }
        if (folder == null) throw new Exception("Nothing to show.");

        IntPtr ppvCm;
        int hr2 = folder.GetUIObjectOf(IntPtr.Zero, (uint)childPidls.Count, childPidls.ToArray(), ref IID_IContextMenu, IntPtr.Zero, out ppvCm);
        if (hr2 != 0 || ppvCm == IntPtr.Zero) throw new Exception("Shell returned no context menu (0x" + hr2.ToString("X") + ").");
        var cm = (IContextMenu)Marshal.GetObjectForIUnknown(ppvCm);
        Marshal.Release(ppvCm);

        var owner = new MenuOwner();
        owner.Cm2 = cm as IContextMenu2;
        owner.Cm3 = cm as IContextMenu3;
        var pt = Cursor.Position;
        owner.Location = pt;
        owner.Show();
        Native.SetForegroundWindow(owner.Handle);

        IntPtr hmenu = Native.CreatePopupMenu();
        uint flags = CMF_CANRENAME | (extended ? CMF_EXTENDEDVERBS : 0);
        cm.QueryContextMenu(hmenu, 0, ID_FIRST, ID_LAST, flags);

        uint cmd = Native.TrackPopupMenuEx(hmenu, TPM_RETURNCMD | TPM_RIGHTBUTTON, pt.X, pt.Y, owner.Handle, IntPtr.Zero);

        if (cmd >= ID_FIRST)
        {
            var info = new CMINVOKECOMMANDINFOEX();
            info.cbSize = (uint)Marshal.SizeOf(typeof(CMINVOKECOMMANDINFOEX));
            info.fMask = CMIC_MASK_UNICODE | CMIC_MASK_PTINVOKE;
            info.hwnd = owner.Handle;
            info.lpVerb = (IntPtr)(cmd - ID_FIRST);
            info.lpVerbW = (IntPtr)(cmd - ID_FIRST);
            info.nShow = 1; // SW_SHOWNORMAL
            info.ptInvoke = new POINT { x = pt.X, y = pt.Y };
            cm.InvokeCommand(ref info);

            // Keep pumping messages: Properties dialogs, clipboard handlers and "Open with"
            // live in this process and vanish if it exits too early.
            var sw = Stopwatch.StartNew();
            while (true)
            {
                Application.DoEvents();
                Thread.Sleep(50);
                if (sw.ElapsedMilliseconds > 2500 && !HasOtherVisibleWindow(owner.Handle)) break;
            }
        }

        try { Native.OleFlushClipboard(); } catch { }
        Native.DestroyMenu(hmenu);
        owner.Close();
        foreach (var p in fullPidls) Native.CoTaskMemFree(p);
        return 0;
    }
}
