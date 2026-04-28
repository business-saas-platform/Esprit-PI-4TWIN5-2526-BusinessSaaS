import { useNavigate } from "react-router-dom";
import { Button } from "@/app/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Plus } from "lucide-react";

import { useBusinessContext } from "@/shared/contexts/BusinessContext";
import { useAuth } from "@/shared/contexts/AuthContext";

export function BusinessSwitcher() {
  const navigate = useNavigate();

  const { businesses, currentBusinessId, setCurrentBusinessId } = useBusinessContext();
  const { user } = useAuth();

  const isOwner = user?.role === "business_owner";

  const currentBusiness = businesses.find((b: any) => String(b.id) === String(currentBusinessId));

  return (
    <div className="space-y-2">
      <Select
        value={currentBusinessId ?? ""}
        onValueChange={(id) => {
          setCurrentBusinessId(id);
          window.dispatchEvent(new Event("business-changed"));
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select business">
            {currentBusiness ? currentBusiness.name : "Select business"}
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          {businesses.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">No businesses</div>
          ) : (
            businesses.map((b: any) => {
              const incomplete = b?.isProfileComplete === false;
              const secondary = b?.category || b?.industry;

              return (
                <SelectItem key={String(b.id)} value={String(b.id)}>
                  <div className="flex items-center justify-between gap-3 w-full">
                    <div className="flex flex-col">
                      <span className="font-medium">{b.name}</span>
                      {secondary ? (
                        <span className="text-xs text-muted-foreground">{secondary}</span>
                      ) : null}
                    </div>

                    {incomplete ? (
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-yellow-50 text-yellow-700">
                        Incomplete
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-green-50 text-green-700">
                        Active
                      </span>
                    )}
                  </div>
                </SelectItem>
              );
            })
          )}

          {/* Add enterprise (owner only) */}
          {isOwner && (
            <div className="p-2 border-t">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate("/dashboard/businesses/new")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add enterprise
              </Button>
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}