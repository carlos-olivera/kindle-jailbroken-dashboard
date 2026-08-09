/**
 * FBInk invocation. Flags differ across builds, so the diagnostic captures
 * `--help` / `-e` output and we keep the final command in one place.
 *
 * Verified against FBInk documentation for the libkh (KOReader helper)
 * builds: `-g file=<path>` displays an image; `-f` (flash) requests a full
 * refresh; `-c` clears the screen first. `w=-1,h=-1` scales to fit while
 * preserving aspect; our PNG is already exactly the panel size.
 *
 * NOTE: the exact flag set must be confirmed on the physical device with
 * `npm run diagnose`, which prints the installed binary's help text.
 */

export interface FbinkDisplayOptions {
  fbinkPath: string;
  imagePath: string;
  /** Full flash refresh (anti-ghosting). */
  flash: boolean;
}

/** Remote argv to display an image full-screen. */
export function buildFbinkImageArgs(opts: FbinkDisplayOptions): string[] {
  const args = [opts.fbinkPath, '-q', '-c', '-g', `file=${opts.imagePath},x=0,y=0`];
  if (opts.flash) args.push('-f');
  return args;
}

/** Remote argv for the diagnostic help capture. */
export function buildFbinkHelpArgs(fbinkPath: string): string[][] {
  return [
    [fbinkPath, '--help'],
    [fbinkPath, '-e'],
  ];
}
