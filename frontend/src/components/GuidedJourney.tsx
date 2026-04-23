import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { bulkImport, submitResult } from '../lib/api'
import type { BulkResultItem, MilestoneDetail, UrgentNeed } from '../lib/api'
import { useAppStore } from '../lib/store'
import { getGuidance, HELPER_CHECK_MAP, journeyOrder } from '../lib/testGuidance'

const ARCHES = ['x86_64', 'aarch64', 'ppc64le', 's390x']

type Stage = 'orientation' | 'install' | 'test-path' | 'automated' | 'testing' | 'done'

// ── Helpers ──────────────────────────────────────────────────────────────────

function sortByJourneyOrder(needs: UrgentNeed[]): UrgentNeed[] {
  const priority = (n: UrgentNeed): number => {
    const lower = n.test_case_name.toLowerCase()
    for (let i = 0; i < journeyOrder.length; i++) {
      if (lower.includes(journeyOrder[i])) return i
    }
    return journeyOrder.length
  }
  return [...needs].sort((a, b) => priority(a) - priority(b))
}

interface HelperOutput {
  arch: string
  deploy_type: string
  hardware_notes?: string
  kernel?: string
  rocky_version?: string
  checks: Record<string, boolean | number>
}

function parseHelperOutput(text: string): { items: BulkResultItem[]; meta: HelperOutput } | null {
  try {
    const data: HelperOutput = JSON.parse(text)
    if (!data.checks || !data.arch) return null
    const items: BulkResultItem[] = []
    for (const [checkKey, mapping] of Object.entries(HELPER_CHECK_MAP)) {
      const val = data.checks[checkKey]
      if (val === undefined) continue
      let outcome: string
      if (typeof val === 'boolean') {
        outcome = val ? mapping.outcomeIfTrue : mapping.outcomeIfFalse
      } else if (typeof val === 'number') {
        outcome = val === 0 ? 'PASS' : 'FAIL'
      } else continue
      const comment =
        checkKey === 'failed_services' && typeof val === 'number' && val > 0
          ? `${val} failed service(s) detected`
          : checkKey === 'boot_errors' && typeof val === 'number' && val > 0
          ? `${val} error-level journal entries on boot`
          : undefined
      items.push({
        section_name: mapping.sectionName,
        test_case_name: mapping.testCasePattern,
        outcome,
        ...(comment ? { comment } : {}),
      })
    }
    return items.length > 0 ? { items, meta: data } : null
  } catch {
    return null
  }
}

// ── Shared layout ────────────────────────────────────────────────────────────

function StageCard({
  stepLabel,
  title,
  children,
  onBack,
}: {
  stepLabel?: string
  title: string
  children: React.ReactNode
  onBack?: () => void
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-6 space-y-4">
      <div className="space-y-1">
        {stepLabel && (
          <p className="text-xs text-emerald-500 uppercase tracking-widest font-semibold">
            {stepLabel}
          </p>
        )}
        <h2 className="text-lg font-bold text-slate-100">{title}</h2>
      </div>
      {children}
      {onBack && (
        <button
          type="button"
          className="text-xs text-slate-600 hover:text-slate-400"
          onClick={onBack}
        >
          ← Back
        </button>
      )}
    </div>
  )
}

function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <div className="relative group">
      <pre className="rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 font-mono text-sm text-emerald-300 overflow-x-auto whitespace-pre-wrap">
        {children}
      </pre>
      <button
        type="button"
        onClick={copy}
        className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

// ── Orientation ──────────────────────────────────────────────────────────────

function OrientationStage({
  releaseName,
  arch,
  name,
  onArchChange,
  onNameChange,
  onNext,
}: {
  releaseName: string
  arch: string
  name: string
  onArchChange: (a: string) => void
  onNameChange: (n: string) => void
  onNext: () => void
}) {
  const [showArchHelp, setShowArchHelp] = useState(false)

  return (
    <StageCard stepLabel="Community testing" title={`You're helping test ${releaseName}`}>
      <p className="text-sm text-slate-400 leading-relaxed">
        This is a pre-release build — not the final version. The Rocky Linux team needs
        people to install it and check that basic things work before it ships to millions
        of users. <strong className="text-slate-300">You don't need expertise.</strong>{' '}
        You just need to try it and report what happens.
      </p>
      <p className="text-xs text-slate-500">
        No account needed. Results are anonymous unless you choose to add your name.
      </p>

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs text-slate-400 font-medium">
            Your name (optional — shown with your results)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. alice or Anonymous"
            className="w-full rounded bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-700"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-400 font-medium">
            What kind of computer will you test on?
          </label>
          <div className="flex flex-wrap gap-2">
            {ARCHES.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => onArchChange(a)}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                  arch === a
                    ? 'bg-emerald-800 text-emerald-200 border border-emerald-700'
                    : 'bg-slate-900 text-slate-400 border border-slate-700 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="text-xs text-slate-600 hover:text-slate-400"
            onClick={() => setShowArchHelp(!showArchHelp)}
          >
            {showArchHelp ? '▼' : '▶'} Not sure which one?
          </button>
          {showArchHelp && (
            <div className="rounded bg-slate-900 border border-slate-700 p-3 text-xs text-slate-400 space-y-1">
              <p><strong className="text-slate-300">x86_64</strong> — most desktop and laptop computers, Intel or AMD processors</p>
              <p><strong className="text-slate-300">aarch64</strong> — ARM-based systems like Raspberry Pi 4/5, Apple Silicon (in a VM), AWS Graviton</p>
              <p><strong className="text-slate-300">ppc64le</strong> — IBM POWER systems</p>
              <p><strong className="text-slate-300">s390x</strong> — IBM Z mainframes</p>
              <p className="text-slate-500 pt-1">If you're on a regular PC or laptop, <strong className="text-slate-400">x86_64</strong> is almost certainly correct.</p>
            </div>
          )}
        </div>
      </div>

      <button type="button" className="btn-primary w-full" onClick={onNext}>
        Next →
      </button>
    </StageCard>
  )
}

// ── Install stage ────────────────────────────────────────────────────────────

function InstallStage({
  releaseName,
  releaseVersion,
  downloadUrl,
  onReady,
  onBack,
}: {
  releaseName: string
  releaseVersion: string
  downloadUrl: string | null
  onReady: () => void
  onBack: () => void
}) {
  const [path, setPath] = useState<'fresh' | 'cloud' | 'upgrade' | null>(null)
  const [step, setStep] = useState(0)

  const freshSteps = 4
  const upgradeSteps = 2
  const cloudSteps = 3
  const totalSteps = path === 'fresh' ? freshSteps : path === 'upgrade' ? upgradeSteps : path === 'cloud' ? cloudSteps : 0
  const stepLabel = totalSteps > 0 ? `Setup — step ${step + 1} of ${totalSteps}` : 'Setup'

  // ── Path selection ──
  if (!path) {
    return (
      <StageCard stepLabel="Setup" title="How will you run Rocky Linux for testing?" onBack={onBack}>
        <div className="grid gap-3">
          <button
            type="button"
            className="rounded-lg border border-emerald-700 bg-emerald-900/20 hover:bg-emerald-900/40 transition-colors p-4 text-left space-y-1"
            onClick={() => setPath('fresh')}
          >
            <p className="text-sm font-semibold text-emerald-300">Fresh install (ISO)</p>
            <p className="text-xs text-slate-400">
              Download the installer and set up Rocky Linux in a virtual machine or on hardware.
              We'll walk you through every step. About 30 minutes.
            </p>
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-700 bg-slate-800/40 hover:bg-slate-800 transition-colors p-4 text-left space-y-1"
            onClick={() => setPath('cloud')}
          >
            <p className="text-sm font-semibold text-slate-300">Cloud image (qcow2, AWS, Azure, GCP)</p>
            <p className="text-xs text-slate-400">
              Boot a pre-built cloud image locally with virt-install or GNOME Boxes,
              or launch from a cloud marketplace. About 15 minutes.
            </p>
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-700 bg-slate-800/40 hover:bg-slate-800 transition-colors p-4 text-left space-y-1"
            onClick={() => setPath('upgrade')}
          >
            <p className="text-sm font-semibold text-slate-300">I already have Rocky Linux running</p>
            <p className="text-xs text-slate-400">
              Switch to the beta packages and test the new version on your existing system.
            </p>
          </button>
        </div>
      </StageCard>
    )
  }

  // ── Fresh install path ──

  if (path === 'fresh' && step === 0) {
    return (
      <StageCard stepLabel={stepLabel} title="Download the Rocky Linux installer" onBack={() => setPath(null)}>
        <p className="text-sm text-slate-400">
          You need an <strong className="text-slate-300">ISO file</strong> — this is a disk image
          that contains the Rocky Linux operating system. Your computer will use it to run the installer.
        </p>

        {downloadUrl ? (
          <div className="space-y-2">
            <a
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg border border-blue-800 bg-blue-950/30 p-4 hover:bg-blue-950/50 transition-colors"
            >
              <p className="text-sm font-semibold text-blue-300">Download {releaseName} ↗</p>
              <p className="text-xs text-blue-500 font-mono truncate mt-0.5">{downloadUrl}</p>
            </a>
            <p className="text-xs text-slate-500">
              The file is typically 1.5–10 GB depending on the edition.
              The <strong className="text-slate-400">minimal ISO</strong> (~2 GB) is fine for testing.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4 space-y-2">
            <p className="text-sm text-slate-400">
              The download link for this beta hasn't been added yet.
              Check the Rocky Linux testing channel for the current link:
            </p>
            <a
              href="https://chat.rockylinux.org/rocky-linux/channels/testing"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-emerald-500 hover:text-emerald-400"
            >
              #testing on Mattermost ↗
            </a>
          </div>
        )}

        <button
          type="button"
          className="btn-primary w-full"
          onClick={() => setStep(1)}
        >
          I have the ISO file →
        </button>
      </StageCard>
    )
  }

  if (path === 'fresh' && step === 1) {
    return (
      <StageCard stepLabel={stepLabel} title="Set up a virtual machine" onBack={() => setStep(0)}>
        <p className="text-sm text-slate-400">
          A <strong className="text-slate-300">virtual machine (VM)</strong> is a simulated computer
          that runs inside your real computer. It's perfect for testing — nothing on your
          actual system is affected, and you can delete it when you're done.
        </p>

        <div className="space-y-3">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
            Using GNOME Boxes (easiest option on Linux)
          </p>
          <div className="space-y-2 text-sm text-slate-300">
            <div className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">1</span>
              <div>
                <p>Install GNOME Boxes if you don't have it:</p>
                <CodeBlock>sudo dnf install gnome-boxes</CodeBlock>
                <p className="text-xs text-slate-500 mt-1">Or find "Boxes" in your Software Center / app store.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">2</span>
              <div>
                <p>Open Boxes and click the <strong>+</strong> button in the top-left corner</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">3</span>
              <div>
                <p>Click <strong>"Create a Virtual Machine from a File"</strong></p>
                <p className="text-xs text-slate-500">Select the ISO file you downloaded in the previous step.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">4</span>
              <div>
                <p>Set the resources — at minimum:</p>
                <ul className="text-xs text-slate-400 list-disc list-inside mt-1 space-y-0.5">
                  <li>Memory: <strong className="text-slate-300">2 GB</strong></li>
                  <li>Storage: <strong className="text-slate-300">20 GB</strong></li>
                </ul>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">5</span>
              <div>
                <p>Click <strong>"Create"</strong> — the VM will start and boot from the ISO</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded border border-slate-800 bg-slate-900/40 px-4 py-3 space-y-1 text-xs text-slate-500">
          <p className="font-medium text-slate-400">Not on Linux? Other options:</p>
          <p><strong className="text-slate-400">VirtualBox</strong> — free, works on Windows, Mac, and Linux (virtualbox.org)</p>
          <p><strong className="text-slate-400">virt-manager</strong> — more advanced, good if you're familiar with KVM/libvirt</p>
          <p><strong className="text-slate-400">Spare machine</strong> — you can also install directly on physical hardware</p>
        </div>

        <button type="button" className="btn-primary w-full" onClick={() => setStep(2)}>
          My VM is running →
        </button>
      </StageCard>
    )
  }

  if (path === 'fresh' && step === 2) {
    return (
      <StageCard stepLabel={stepLabel} title="Install Rocky Linux" onBack={() => setStep(1)}>
        <p className="text-sm text-slate-400">
          The Rocky Linux installer (called <strong className="text-slate-300">Anaconda</strong>)
          will guide you through setup. Here are the key steps:
        </p>

        <div className="space-y-2 text-sm text-slate-300">
          <div className="flex gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">1</span>
            <p><strong>Select your language</strong> and click Continue</p>
          </div>
          <div className="flex gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">2</span>
            <div>
              <p>On the summary screen, click <strong>"Installation Destination"</strong></p>
              <p className="text-xs text-slate-500">Select the disk (it's usually already selected) → click <strong>Done</strong> in the top-left</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">3</span>
            <div>
              <p>Click <strong>"Root Password"</strong> and set a password you'll remember</p>
              <p className="text-xs text-slate-500">Or click "User Creation" to make a regular user — check "Make this user administrator"</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">4</span>
            <p>Click <strong>"Begin Installation"</strong> and wait (5–15 minutes)</p>
          </div>
          <div className="flex gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">5</span>
            <p>When it's done, click <strong>"Reboot System"</strong></p>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          If you get stuck, the{' '}
          <a
            href="https://docs.rockylinux.org/guides/installation/"
            target="_blank"
            rel="noreferrer"
            className="text-emerald-600 hover:text-emerald-400"
          >
            Rocky Linux installation guide ↗
          </a>
          {' '}has screenshots of every step.
        </p>

        <button type="button" className="btn-primary w-full" onClick={() => setStep(3)}>
          It's installed and rebooting →
        </button>
      </StageCard>
    )
  }

  // ── Cloud image path ──

  if (path === 'cloud' && step === 0) {
    return (
      <StageCard stepLabel={stepLabel} title="Get a Rocky Linux cloud image" onBack={() => setPath(null)}>
        <p className="text-sm text-slate-400">
          A <strong className="text-slate-300">cloud image</strong> is a pre-installed disk that boots
          directly — no installer needed. You can run it locally with virtualization tools or
          on a cloud provider.
        </p>

        {downloadUrl ? (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg border border-blue-800 bg-blue-950/30 p-4 hover:bg-blue-950/50 transition-colors"
          >
            <p className="text-sm font-semibold text-blue-300">Download {releaseName} images ↗</p>
            <p className="text-xs text-blue-500 font-mono truncate mt-0.5">{downloadUrl}</p>
          </a>
        ) : (
          <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4 space-y-2">
            <p className="text-sm text-slate-400">
              The download link hasn't been added yet. Check for cloud images on:
            </p>
            <a
              href="https://dl.rockylinux.org/pub/rocky/"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-emerald-500 hover:text-emerald-400"
            >
              dl.rockylinux.org ↗
            </a>
          </div>
        )}

        <div className="rounded border border-slate-800 bg-slate-900/40 px-4 py-3 text-xs text-slate-500">
          <p className="font-medium text-slate-400 mb-1">Which image format?</p>
          <p><strong className="text-slate-400">qcow2</strong> — for local VMs (KVM, GNOME Boxes, virt-manager)</p>
          <p><strong className="text-slate-400">AMI</strong> — for AWS EC2</p>
          <p><strong className="text-slate-400">VHD</strong> — for Azure</p>
          <p><strong className="text-slate-400">GCE</strong> — for Google Cloud</p>
          <p className="mt-1 text-slate-600">If testing locally, download the <strong className="text-slate-500">qcow2</strong> (GenericCloud) image.</p>
        </div>

        <button type="button" className="btn-primary w-full" onClick={() => setStep(1)}>
          I have the image →
        </button>
      </StageCard>
    )
  }

  if (path === 'cloud' && step === 1) {
    return (
      <StageCard stepLabel={stepLabel} title="Boot the cloud image" onBack={() => setStep(0)}>
        <p className="text-sm text-slate-400">
          Choose how you want to run the image. If testing locally, <strong className="text-slate-300">virt-install</strong> or
          <strong className="text-slate-300"> GNOME Boxes</strong> are the easiest options.
        </p>

        <div className="space-y-3">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
            Option A: Using virt-install (command line)
          </p>
          <CodeBlock>{`sudo dnf install virt-install libvirt qemu-kvm -y\nsudo systemctl enable --now libvirtd\n\nvirt-install \\\n  --name rocky-test \\\n  --memory 2048 \\\n  --vcpus 2 \\\n  --disk path=Rocky-${releaseVersion}-x86_64-GenericCloud.qcow2 \\\n  --import \\\n  --os-variant rocky9 \\\n  --cloud-init \\\n  --noautoconsole`}</CodeBlock>
          <p className="text-xs text-slate-500">
            The <code className="text-slate-400">--cloud-init</code> flag sets up a temporary password.
            After the VM boots, use <code className="text-slate-400">virsh console rocky-test</code> to connect.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
            Option B: Using GNOME Boxes
          </p>
          <div className="text-sm text-slate-300 space-y-1">
            <p>1. Open Boxes and click <strong>+</strong></p>
            <p>2. Select <strong>"Create a Virtual Machine from a File"</strong></p>
            <p>3. Choose the <code className="text-emerald-400">.qcow2</code> file</p>
            <p>4. Set at least 2 GB memory and click <strong>Create</strong></p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
            Option C: Cloud provider
          </p>
          <div className="text-xs text-slate-500 space-y-1">
            <p><strong className="text-slate-400">AWS:</strong> Launch from the Rocky Linux AMI in your region's marketplace</p>
            <p><strong className="text-slate-400">Azure:</strong> Search "Rocky Linux" in the Azure Marketplace</p>
            <p><strong className="text-slate-400">GCP:</strong> Use the Rocky Linux image from Compute Engine</p>
          </div>
          <p className="text-xs text-slate-600">After launch, SSH into the instance as the default user.</p>
        </div>

        <button type="button" className="btn-primary w-full" onClick={() => setStep(2)}>
          It's booted and I can connect →
        </button>
      </StageCard>
    )
  }

  // ── Verify step (shared between fresh, cloud, and upgrade) ──

  if ((path === 'fresh' && step === 3) || (path === 'cloud' && step === 2) || (path === 'upgrade' && step === 1)) {
    return (
      <StageCard
        stepLabel={stepLabel}
        title="Log in and open a terminal"
        onBack={() => setStep(step - 1)}
      >
        <div className="space-y-3 text-sm text-slate-300">
          <div className="flex gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">1</span>
            <p>
              <strong>Log in</strong> with the username and password you set during installation.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">2</span>
            <div>
              <p><strong>Open a terminal</strong> (this is where you'll type commands):</p>
              <ul className="text-xs text-slate-400 mt-1 space-y-1">
                <li>
                  <strong className="text-slate-300">Desktop (graphical install):</strong>{' '}
                  Click <strong>"Activities"</strong> in the top-left corner → type <strong>Terminal</strong> → click the Terminal app
                </li>
                <li>
                  <strong className="text-slate-300">Server / minimal install:</strong>{' '}
                  You're already looking at a terminal — just start typing
                </li>
              </ul>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">3</span>
            <div>
              <p><strong>Verify</strong> you're running the beta. Type this and press Enter:</p>
              <CodeBlock>cat /etc/rocky-release</CodeBlock>
              <div className="mt-2 rounded bg-slate-900/60 border border-slate-700 px-3 py-2 text-xs">
                <p className="text-slate-500">You should see something like:</p>
                <p className="text-emerald-300 font-mono mt-0.5">Rocky Linux release {releaseVersion} (Blue Onyx)</p>
              </div>
            </div>
          </div>
        </div>

        <button type="button" className="btn-primary w-full" onClick={onReady}>
          I see the right version — let's test →
        </button>
      </StageCard>
    )
  }

  // ── Upgrade path ──

  if (path === 'upgrade' && step === 0) {
    return (
      <StageCard stepLabel={stepLabel} title="Switch to the beta packages" onBack={() => setPath(null)}>
        <p className="text-sm text-slate-400">
          You'll tell your system to use the pre-release (beta) packages instead of the
          stable ones. This lets you test the new version without a fresh install.
        </p>

        <div className="rounded-lg border border-yellow-900/50 bg-yellow-950/20 px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-yellow-500">
            Important: exact commands vary by release
          </p>
          <p className="text-xs text-slate-400">
            The package names and repo URLs change for each beta. Check the
            current instructions before running these commands:
          </p>
          <a
            href="https://chat.rockylinux.org/rocky-linux/channels/testing"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-emerald-500 hover:text-emerald-400"
          >
            #testing on Mattermost — current beta instructions ↗
          </a>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
            Typical upgrade steps
          </p>
          <p className="text-sm text-slate-400">
            In your terminal, run these commands one at a time (type each line, press Enter, wait for it to finish):
          </p>
          <CodeBlock>{`sudo dnf distro-sync --releasever=${releaseVersion}\nsudo reboot`}</CodeBlock>
          <p className="text-xs text-slate-500">
            <strong className="text-slate-400">sudo</strong> runs a command as administrator — it will ask for your password.{' '}
            <strong className="text-slate-400">dnf distro-sync</strong> switches all packages to the beta version.{' '}
            <strong className="text-slate-400">reboot</strong> restarts your system with the new packages.
          </p>
        </div>

        <button type="button" className="btn-primary w-full" onClick={() => setStep(1)}>
          I've upgraded and rebooted →
        </button>
      </StageCard>
    )
  }

  return null
}

// ── Test path selection ──────────────────────────────────────────────────────

function TestPathStage({
  hasManualTests,
  onAutomated,
  onManual,
  onStandard,
}: {
  hasManualTests: boolean
  onAutomated: () => void
  onManual: () => void
  onStandard: () => void
}) {
  return (
    <StageCard stepLabel="Testing" title="How do you want to test?">
      <p className="text-sm text-slate-400">
        You're running Rocky Linux — now let's check that everything works.
      </p>

      <div className="space-y-3">
        <button
          type="button"
          className="w-full rounded-lg border border-emerald-700 bg-emerald-900/20 hover:bg-emerald-900/40 transition-colors p-4 text-left space-y-1"
          onClick={onAutomated}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-emerald-300">Run the automated checker</p>
            <span className="text-xs bg-emerald-900/60 text-emerald-400 px-2 py-0.5 rounded font-medium">
              recommended
            </span>
          </div>
          <p className="text-xs text-slate-400">
            One command checks 8 things automatically. Copy the command, paste it into your terminal,
            paste the results back here. About 2 minutes.
          </p>
        </button>

        {hasManualTests && (
          <button
            type="button"
            className="w-full rounded-lg border border-slate-700 bg-slate-800/40 hover:bg-slate-800 transition-colors p-4 text-left space-y-1"
            onClick={onManual}
          >
            <p className="text-sm font-semibold text-slate-300">Walk me through each test</p>
            <p className="text-xs text-slate-500">
              Step-by-step instructions for each test, one at a time. We'll explain what
              each command does and what the results mean. About 15 minutes.
            </p>
          </button>
        )}

        <button
          type="button"
          className="w-full rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-800/60 transition-colors p-4 text-left space-y-1"
          onClick={onStandard}
        >
          <p className="text-sm font-semibold text-slate-400">I'm experienced — show me the full list</p>
          <p className="text-xs text-slate-600">
            Skip the guided flow and browse all test cases.
          </p>
        </button>
      </div>

      <div className="border-t border-slate-800 pt-3 space-y-1">
        <p className="text-xs font-medium text-slate-500">Prefer fully automated testing?</p>
        <p className="text-xs text-slate-600">
          RESF also maintains{' '}
          <a href="https://openqa.rockylinux.org" target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-400">
            OpenQA ↗
          </a>{' '}
          and{' '}
          <a href="https://git.resf.org/testing/Sparky_Getting_Started" target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-400">
            Sparky ↗
          </a>{' '}
          for automated install and system testing.
        </p>
      </div>
    </StageCard>
  )
}

// ── Automated test stage ─────────────────────────────────────────────────────

function AutomatedTestStage({
  milestoneId,
  username,
  onDone,
  onBack,
}: {
  milestoneId: number
  username: string
  onDone: (count: number) => void
  onBack: () => void
}) {
  const queryClient = useQueryClient()
  const [rawText, setRawText] = useState('')
  const [parsed, setParsed] = useState<{ items: BulkResultItem[]; meta: HelperOutput } | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => {
      if (!parsed) throw new Error('Nothing to submit')
      return bulkImport(milestoneId, {
        submitter_name: username || undefined,
        arch: parsed.meta.arch,
        deploy_type: parsed.meta.deploy_type || 'bare-metal',
        hardware_notes: parsed.meta.hardware_notes,
        results: parsed.items,
      })
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['milestone', milestoneId] })
      queryClient.invalidateQueries({ queryKey: ['coverage', milestoneId] })
      queryClient.invalidateQueries({ queryKey: ['urgent-needs', milestoneId] })
      queryClient.invalidateQueries({ queryKey: ['releases'] })
      onDone(data.imported)
    },
  })

  const handleParse = () => {
    setParseError(null)
    const result = parseHelperOutput(rawText.trim())
    if (!result) {
      setParseError(
        'Could not parse the output. Make sure you copied the full text starting with { and ending with }',
      )
      setParsed(null)
    } else {
      setParsed(result)
    }
  }

  const OUTCOME_COLOR: Record<string, string> = {
    PASS: 'text-emerald-400',
    FAIL: 'text-red-400',
  }

  if (parsed) {
    return (
      <StageCard stepLabel="Automated check" title="Review your results">
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm">
          <div className="flex gap-4 text-slate-400">
            <span>Architecture: <strong className="text-slate-200">{parsed.meta.arch}</strong></span>
            <span>System: <strong className="text-slate-200">{parsed.meta.deploy_type}</strong></span>
          </div>
          {parsed.meta.rocky_version && (
            <p className="text-xs text-slate-600 mt-1">Rocky Linux {parsed.meta.rocky_version}</p>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
            {parsed.items.length} checks completed
          </p>
          {parsed.items.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded bg-slate-800/50 px-3 py-2 text-sm"
            >
              <span className={`font-bold w-10 ${OUTCOME_COLOR[item.outcome] ?? 'text-slate-400'}`}>
                {item.outcome === 'PASS' ? '✓' : '✕'}
              </span>
              <span className="text-slate-300">{item.test_case_name}</span>
              {item.comment && (
                <span className="text-slate-600 text-xs ml-auto">{item.comment}</span>
              )}
            </div>
          ))}
        </div>

        {mutation.isError && (
          <p className="text-xs text-red-400">{String(mutation.error)}</p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            className="btn-primary flex-1"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || mutation.isSuccess}
          >
            {mutation.isPending
              ? 'Submitting…'
              : mutation.isSuccess
              ? 'Submitted ✓'
              : `Submit ${parsed.items.length} results`}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => { setParsed(null); setRawText('') }}
            disabled={mutation.isPending}
          >
            Back
          </button>
        </div>
      </StageCard>
    )
  }

  const [showSource, setShowSource] = useState(false)

  return (
    <StageCard stepLabel="Automated check" title="Run the automated checker" onBack={onBack}>
      <p className="text-sm text-slate-400">
        This script checks 8 things about your Rocky Linux system automatically.
        It only reads information — it doesn't change anything on your system.
      </p>

      <div className="rounded border border-slate-800 bg-slate-900/40 px-4 py-3 space-y-1.5">
        <p className="text-xs font-medium text-slate-400">What it checks:</p>
        <ul className="text-xs text-slate-500 space-y-0.5">
          <li>✓ Security policy is active (SELinux) — <code className="text-slate-400">getenforce</code></li>
          <li>✓ Firewall is running — <code className="text-slate-400">systemctl is-active firewalld</code></li>
          <li>✓ SSH server is listening — <code className="text-slate-400">systemctl is-active sshd</code></li>
          <li>✓ System clock is synchronized — <code className="text-slate-400">timedatectl show</code></li>
          <li>✓ Boot target is configured correctly — <code className="text-slate-400">systemctl get-default</code></li>
          <li>✓ Package manager is healthy — <code className="text-slate-400">dnf check-update</code></li>
          <li>✓ No failed system services — <code className="text-slate-400">systemctl --failed</code></li>
          <li>✓ No critical errors in boot log — <code className="text-slate-400">journalctl -b -p err</code></li>
        </ul>
        <div className="pt-1.5 flex items-center gap-3">
          <a
            href="/r3p-helper.sh"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-500 hover:text-blue-400"
          >
            View full script source ↗
          </a>
          <button
            type="button"
            className="text-xs text-slate-600 hover:text-slate-400"
            onClick={() => setShowSource(!showSource)}
          >
            {showSource ? '▼ Hide details' : '▶ How it works'}
          </button>
        </div>
        {showSource && (
          <div className="pt-2 space-y-2 border-t border-slate-800 mt-2">
            <p className="text-xs text-slate-400">
              The script runs the commands listed above, collects their output into a JSON object,
              and prints it to your terminal. It does <strong className="text-slate-300">not</strong> send
              any data anywhere — you copy the output and paste it here yourself.
            </p>
            <p className="text-xs text-slate-500">
              It also auto-detects your architecture (<code className="text-slate-400">uname -m</code>),
              whether you're on bare metal or a VM, and your Rocky Linux version.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
          Option A: Run directly
        </p>
        <CodeBlock>curl -sSL https://r3p.bradydibble.com/r3p-helper.sh | bash</CodeBlock>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
          Option B: Download and inspect first
        </p>
        <CodeBlock>{`wget https://r3p.bradydibble.com/r3p-helper.sh\nless r3p-helper.sh        # read the script\nbash r3p-helper.sh        # run it when you're ready`}</CodeBlock>
        <p className="text-xs text-slate-600">
          This lets you review exactly what the script does before running it.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-slate-400">
          When the command finishes, it prints a block of text starting with{' '}
          <code className="text-emerald-400">{'{'}</code>.
          Select <strong className="text-slate-300">all of it</strong>, copy, and paste it here:
        </p>
        <textarea
          className="w-full h-36 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 font-mono text-xs text-slate-300 placeholder-slate-600 resize-none focus:outline-none focus:border-emerald-700"
          placeholder={'{\n  "arch": "x86_64",\n  "deploy_type": "bare-metal",\n  "checks": { ... }\n}'}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
        />
      </div>

      {parseError && (
        <p className="text-xs text-red-400">{parseError}</p>
      )}

      <button
        type="button"
        className="btn-primary w-full"
        onClick={handleParse}
        disabled={!rawText.trim()}
      >
        Preview results →
      </button>
    </StageCard>
  )
}

// ── Manual test step ─────────────────────────────────────────────────────────

function TestStep({
  need,
  arch,
  stepNumber,
  totalSteps,
  milestoneId,
  username,
  onSubmit,
  onSkip,
  onBack,
}: {
  need: UrgentNeed
  arch: string
  stepNumber: number
  totalSteps: number
  milestoneId: number
  username: string
  onSubmit: () => void
  onSkip: () => void
  onBack: () => void
}) {
  const queryClient = useQueryClient()
  const [quickOutcome, setQuickOutcome] = useState<'works' | 'issues' | 'broken' | null>(null)
  const [notes, setNotes] = useState('')

  const outcomeMap: Record<'works' | 'issues' | 'broken', string> = {
    works: 'PASS',
    issues: 'PARTIAL',
    broken: 'FAIL',
  }

  const mutation = useMutation({
    mutationFn: () =>
      submitResult(need.test_case_id, {
        outcome: outcomeMap[quickOutcome!],
        arch,
        deploy_type: 'bare metal',
        submission_method: 'quick',
        quick_outcome: quickOutcome!,
        submitter_name: username || undefined,
        ...(notes.trim() ? { comment: notes.trim() } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urgent-needs', milestoneId] })
      queryClient.invalidateQueries({ queryKey: ['milestone', milestoneId] })
      queryClient.invalidateQueries({ queryKey: ['coverage', milestoneId] })
      queryClient.invalidateQueries({ queryKey: ['releases'] })
      onSubmit()
    },
  })

  const guidance = getGuidance(need.test_case_name)
  const needsNotes = quickOutcome === 'issues' || quickOutcome === 'broken'

  return (
    <StageCard
      stepLabel={`Test ${stepNumber} of ${totalSteps}`}
      title={need.test_case_name}
      onBack={stepNumber === 1 ? onBack : undefined}
    >
      {/* Progress */}
      <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-600 transition-all"
          style={{ width: `${((stepNumber - 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Guidance */}
      {guidance ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            In your terminal, type {guidance.steps.length === 1 ? 'this command' : 'these commands one at a time'} and press Enter:
          </p>
          {guidance.steps.map((step, i) => (
            <div key={i} className="space-y-1">
              <CodeBlock>{step.replace(/^Run:\s*/i, '')}</CodeBlock>
            </div>
          ))}
          <div className="rounded bg-slate-900/60 border border-slate-700 px-3 py-2.5 space-y-1">
            <p className="text-xs font-medium text-slate-400">What to look for:</p>
            <p className="text-sm text-slate-300">{guidance.expect}</p>
          </div>
          {guidance.timeEstimate && (
            <p className="text-xs text-slate-600">Estimated time: ~{guidance.timeEstimate}</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-slate-400">
            Check whether this works on your Rocky Linux system. If you're not sure
            how to test it, click "Can't test this" to skip to the next one.
          </p>
        </div>
      )}

      {/* Outcome buttons */}
      <div>
        <p className="text-xs text-slate-500 mb-2">What happened?</p>
        <div className="grid grid-cols-3 gap-2">
          {([
            { key: 'works' as const, icon: '✓', label: 'Works', active: 'border-emerald-500 bg-emerald-900/40 text-emerald-300' },
            { key: 'issues' as const, icon: '~', label: 'Has issues', active: 'border-yellow-500 bg-yellow-900/40 text-yellow-300' },
            { key: 'broken' as const, icon: '✕', label: 'Broken', active: 'border-red-500 bg-red-900/40 text-red-300' },
          ]).map(({ key, icon, label, active }) => (
            <button
              key={key}
              type="button"
              onClick={() => setQuickOutcome(key)}
              className={`rounded-lg border-2 py-3 text-center cursor-pointer transition-all ${
                quickOutcome === key ? active : 'border-slate-700 text-slate-500 hover:border-slate-500'
              }`}
            >
              <div className="text-lg font-bold">{icon}</div>
              <div className="text-xs font-medium mt-0.5">{label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Notes (required for issues/broken) */}
      {needsNotes && (
        <div className="space-y-1">
          <label className="text-xs text-slate-400 font-medium">
            What went wrong? <span className="text-red-400">*</span>
          </label>
          <textarea
            className="w-full h-20 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-300 placeholder-slate-600 resize-none focus:outline-none focus:border-emerald-700"
            placeholder="Describe what you saw — error messages, unexpected behavior, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <p className="text-xs text-slate-600">
            This helps the release team understand and fix the issue.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="btn-primary flex-1"
          disabled={
            !quickOutcome ||
            (needsNotes && !notes.trim()) ||
            mutation.isPending ||
            mutation.isSuccess
          }
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? 'Submitting…' : mutation.isSuccess ? 'Submitted ✓' : 'Submit'}
        </button>
        <button
          type="button"
          className="btn-ghost text-xs"
          onClick={onSkip}
          disabled={mutation.isPending}
        >
          Can't test this →
        </button>
      </div>

      {mutation.isError && (
        <p className="text-xs text-red-400">{String(mutation.error)}</p>
      )}
    </StageCard>
  )
}

// ── Graduation ───────────────────────────────────────────────────────────────

function GraduationStage({
  submittedCount,
  releaseName,
  arch,
  onKeepTesting,
}: {
  submittedCount: number
  releaseName: string
  arch: string
  onKeepTesting: () => void
}) {
  const [copied, setCopied] = useState(false)

  const share = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="rounded-xl border border-emerald-800 bg-emerald-950/20 p-6 text-center space-y-4">
      <p className="text-4xl">✓</p>
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-emerald-300">Testing complete</h2>
        {submittedCount > 0 ? (
          <p className="text-sm text-slate-400">
            You submitted <strong className="text-slate-200">{submittedCount} result{submittedCount !== 1 ? 's' : ''}</strong>{' '}
            for {releaseName} on <code className="text-emerald-400">{arch}</code>.{' '}
            The Rocky Linux team can see your results alongside other testers.
          </p>
        ) : (
          <p className="text-sm text-slate-400">
            You worked through the guided checks for {releaseName}.
          </p>
        )}
        <p className="text-xs text-slate-500">That's genuinely helpful — thank you.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <button type="button" className="btn-primary" onClick={onKeepTesting}>
          Keep testing (full list) →
        </button>
        <button type="button" className="btn-outline text-xs" onClick={share}>
          {copied ? 'Copied!' : 'Share this test run'}
        </button>
      </div>

      <p className="text-xs text-slate-600">
        Questions?{' '}
        <a
          href="https://chat.rockylinux.org/rocky-linux/channels/testing"
          target="_blank"
          rel="noreferrer"
          className="text-emerald-700 hover:text-emerald-500"
        >
          Join #testing on Mattermost ↗
        </a>
      </p>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

interface Props {
  milestone: MilestoneDetail
  needs: UrgentNeed[]
}

export default function GuidedJourney({ milestone, needs }: Props) {
  const { username, setUsername, preferredArch, setPreferredArch, setMode } = useAppStore()

  const [stage, setStage] = useState<Stage>('orientation')
  const [localName, setLocalName] = useState(username)
  const [arch, setArch] = useState(preferredArch || 'x86_64')
  const [stepIndex, setStepIndex] = useState(0)
  const [submittedCount, setSubmittedCount] = useState(0)

  const orderedNeeds = sortByJourneyOrder(needs).slice(0, 12)
  const totalSteps = orderedNeeds.length
  const currentNeed = orderedNeeds[stepIndex]

  const releaseName = `Rocky Linux ${milestone.release_version} ${milestone.name.toUpperCase()}`

  const commitIdentity = () => {
    if (localName.trim()) setUsername(localName.trim())
    setPreferredArch(arch)
  }

  if (stage === 'orientation') {
    return (
      <OrientationStage
        releaseName={releaseName}
        arch={arch}
        name={localName}
        onArchChange={setArch}
        onNameChange={setLocalName}
        onNext={() => {
          commitIdentity()
          setStage('install')
        }}
      />
    )
  }

  if (stage === 'install') {
    return (
      <InstallStage
        releaseName={releaseName}
        releaseVersion={milestone.release_version}
        downloadUrl={milestone.download_url}
        onReady={() => setStage('test-path')}
        onBack={() => setStage('orientation')}
      />
    )
  }

  if (stage === 'test-path') {
    return (
      <TestPathStage
        hasManualTests={totalSteps > 0}
        onAutomated={() => setStage('automated')}
        onManual={() => {
          if (totalSteps === 0) {
            setStage('done')
          } else {
            setStage('testing')
          }
        }}
        onStandard={() => setMode('standard')}
      />
    )
  }

  if (stage === 'automated') {
    return (
      <AutomatedTestStage
        milestoneId={milestone.id}
        username={localName}
        onDone={(count) => {
          setSubmittedCount(count)
          setStage('done')
        }}
        onBack={() => setStage('test-path')}
      />
    )
  }

  if (stage === 'testing' && currentNeed) {
    return (
      <TestStep
        key={currentNeed.test_case_id}
        need={currentNeed}
        arch={arch}
        stepNumber={stepIndex + 1}
        totalSteps={totalSteps}
        milestoneId={milestone.id}
        username={localName}
        onSubmit={() => {
          setSubmittedCount((c) => c + 1)
          if (stepIndex + 1 >= totalSteps) {
            setStage('done')
          } else {
            setStepIndex((i) => i + 1)
          }
        }}
        onSkip={() => {
          if (stepIndex + 1 >= totalSteps) {
            setStage('done')
          } else {
            setStepIndex((i) => i + 1)
          }
        }}
        onBack={() => setStage('test-path')}
      />
    )
  }

  return (
    <GraduationStage
      submittedCount={submittedCount}
      releaseName={releaseName}
      arch={arch}
      onKeepTesting={() => setMode('standard')}
    />
  )
}
