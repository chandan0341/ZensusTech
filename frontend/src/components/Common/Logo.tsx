import { Link } from "@tanstack/react-router"

import { cn } from "@/lib/utils"
import logoIcon from "/zensustech-logo-2.png"

interface LogoProps {
  variant?: "full" | "icon" | "responsive"
  className?: string
  asLink?: boolean
}

export function Logo({
  variant = "full",
  className,
  asLink = true,
}: LogoProps) {
  const content =
    variant === "responsive" ? (
      <>
        <div className="flex items-center gap-2">
          <img
            src={logoIcon}
            alt="ZensusTech Logo"
            className="h-8 w-8 group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:w-6"
          />
          <span
            className={cn(
              "text-xl font-bold text-foreground group-data-[collapsible=icon]:hidden",
              className,
            )}
          >
            ZensusTech
          </span>
        </div>
        <span
          className={cn(
            "text-lg font-bold text-foreground hidden group-data-[collapsible=icon]:block",
            className,
          )}
        >
          ZT
        </span>
      </>
    ) : variant === "full" ? (
      <div className="flex items-center gap-2">
        <img
          src={logoIcon}
          alt="ZensusTech Logo"
          className="h-8 w-8"
        />
        <span
          className={cn(
            "text-xl font-bold text-foreground",
            className,
          )}
        >
          ZensusTech
        </span>
      </div>
    ) : (
      <div className="flex items-center">
        <img
          src={logoIcon}
          alt="ZensusTech Logo"
          className="h-25 w-25"
        />
      </div>
    )

  if (!asLink) {
    return content
  }

  return <Link to="/dashboard">{content}</Link>
}
